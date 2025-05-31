frappe.ui.form.on("Car Repair", {
    refresh: function (frm) {
        frm.set_query('technician', function () {
            return {
                filters: {
                    designation: 'Technician'
                }
            };
        });

        frm.set_query('service_manager', function () {
            return {
                filters: {
                    designation: 'Service Manager'
                }
            };
        });

        if (frm.doc.attachments) {
            frm.set_value('image_preview', frm.doc.attachments);
        }

        if (frm.is_new()) {
            frm.set_value('repair_request_date', frappe.datetime.now_datetime());
        }

        calculate_total_item_cost(frm);
        calculate_total_cost(frm);

        frm.add_custom_button(__('Create Sales Invoice'), function () {
            create_sales_invoice(frm);
        }, __("Create"));
    },

    onload: function (frm) {
        set_item_filters(frm);
    },

    customer: function (frm) {
        if (frm.doc.customer) {
            frappe.call({
                method: 'frappe.client.get',
                args: {
                    doctype: 'Customer',
                    name: frm.doc.customer
                },
                callback: function (response) {
                    if (response.message) {
                        frm.set_value('mobile', response.message.mobile_no);
                        frm.set_value('email', response.message.email_id);
                    }
                }
            });
        }
    },

    attachments: function (frm) {
        if (frm.doc.attachments) {
            frm.set_value('image_preview', frm.doc.attachments);
        }
    },

    car_diagnosis: function (frm) {
        if (frm.doc.car_diagnosis) {
            frappe.call({
                method: 'frappe.client.get',
                args: {
                    doctype: 'Car Diagnosis',
                    name: frm.doc.car_diagnosis
                },
                callback: function (response) {
                    if (response.message) {
                        let car_details = response.message.car_details || [];

                        if (car_details.length > 0) {
                            let car = car_details[0];
                            frm.set_value('car', car.license_plate);
                            frm.set_value('car_name', car.car);
                            frm.set_value('fuel_type', car.fuel_type);
                            frm.set_value('chassis_no', car.chassis_number);
                        }

                        let services = response.message.services || [];

                        frm.clear_table("services");
                        services.forEach(service => {
                            let row = frm.add_child("services");
                            row.item = service.item;
                            row.qty = service.qty;
                            row.item_cost = service.item_cost;
                            row.total_cost = service.total_cost;
                        });

                        frm.set_value('service_cost', response.message.total_cost);
                        frm.refresh_field("services");
                        calculate_total_cost(frm);
                    }
                }
            });
        }
    },

    items_add: function (frm) {
        calculate_total_item_cost(frm);
    },

    items_remove: function (frm) {
        calculate_total_item_cost(frm);
    },

    item_cost: function (frm) {
        calculate_total_cost(frm);
    },

    service_cost: function (frm) {
        calculate_total_cost(frm);
    },

    total_cost: function (frm) {
        calculate_total_cost(frm);
    }
});

frappe.ui.form.on('Service Item Checklist', {
    item: function (frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (row.item) {
            frappe.call({
                method: 'frappe.client.get',
                args: {
                    doctype: 'Item',
                    name: row.item
                },
                callback: function (res) {
                    if (res.message) {
                        row.item_cost = res.message.valuation_rate || 0;
                        row.total_cost = row.item_cost * row.qty;
                        frm.refresh_field("items");
                        calculate_total_item_cost(frm);
                    }
                }
            });
        }
    },
    qty: function (frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        row.total_cost = row.item_cost * row.qty;
        frm.refresh_field("items");
        calculate_total_item_cost(frm);
    }
});

function set_item_filters(frm) {
    frm.fields_dict['items'].grid.get_field('item').get_query = function () {
        let selected_item = (frm.doc.items || []).map(row => row.item);
        return {
            filters: [
                ['item_group', '=', "products"],
                ['name', 'not in', selected_item]
            ]
        };
    };
}

function calculate_total_item_cost(frm) {
    let total = 0;
    (frm.doc.items || []).forEach(row => {
        total += row.total_cost || 0;
    });

    frm.set_value('item_cost', total);
    calculate_total_cost(frm);
    frm.refresh_field("item_cost");
}

function calculate_total_cost(frm) {
    let total = (frm.doc.service_cost || 0) + (frm.doc.item_cost || 0);
    frm.set_value('total_cost', total);
    frm.refresh_field("total_cost");
}


// Create Sales Invoice Button Script 

function create_sales_invoice(frm) {
    let invoice_items = get_invoice_items(frm);
    if (invoice_items.length === 0) {
        frappe.msgprint(__('Cannot create Sales Invoice. No valid items found.'));
        return;
    }

    frappe.call({
        method: "frappe.client.get_value",
        args: {
            doctype: "Company",
            fieldname: "default_income_account",
            filters: { name: frm.doc.company }
        },
        callback: function (response) {
            let income_account = response.message ? response.message.default_income_account : null;
            if (!income_account) {
                frappe.msgprint(__('No Default Income Account found for the company. Please set it in Company settings.'));
                return;
            }

            invoice_items.forEach(item => {
                item.income_account = income_account;
            });

            frappe.call({
                method: "frappe.client.insert",
                args: {
                    doc: {
                        doctype: "Sales Invoice",
                        customer: frm.doc.customer,
                        company: frm.doc.company,
                        posting_date: frappe.datetime.nowdate(),
                        due_date: frappe.datetime.add_days(frappe.datetime.nowdate(), 7),
                        items: invoice_items,
                        total: frm.doc.total_cost
                    }
                },
                callback: function (response) {
                    if (response.message) {
                        frappe.msgprint(__('Sales Invoice Created: {0}', [response.message.name]));
                        frappe.set_route("Form", "Sales Invoice", response.message.name);
                    }
                }
            });
        }
    });
}

function get_invoice_items(frm) {
    let items = [];

    (frm.doc.services || []).forEach(row => {
        if (row.qty > 0) {
            items.push({
                // item_code: row.,
                item_name: row.item,  // ✅ Add Item Name
                qty: row.qty,
                rate: row.item_cost,
                amount: row.total_cost
            });
        }
    });

    (frm.doc.items || []).forEach(row => {
        if (row.qty > 0) {
            items.push({
                // item_code: row.item,
                item_name: row.item,  // ✅ Add Item Name
                qty: row.qty,
                rate: row.item_cost,
                amount: row.total_cost
            });
        }
    });

    return items;
}