frappe.ui.form.on('Car Diagnosis', {
    refresh: function (frm) {
        if (!frm.is_new()) {
            // Create Dropdown Button
            frm.add_custom_button(__('Quotation'), function () {
                create_sales_quotation(frm);
            }, __('Create'));

            frm.add_custom_button(__('Car Repair'), function () {
                create_car_repair(frm);
            }, __('Create'));
        }

        // Prevent duplicate services in services table
        frm.fields_dict['services'].grid.get_field('service').get_query = function () {
            let selected_services = (frm.doc.services || []).map(row => row.service);
            return {
                filters: [['name', 'not in', selected_services]]
            };
        };
    },

    onload: function (frm) {
        if (!frm.doc.receipt_date) {
            frm.set_value('receipt_date', frappe.datetime.now_date());
        }
        set_car_filters(frm);
        set_service_filters(frm);
    },

    customer: function (frm) {
        fetch_customer_details(frm, frm.doc.customer);
        set_car_filters(frm);
    },

    mobile: function (frm) {
        if (frm.doc.mobile) {
            frappe.call({
                method: 'frappe.client.get_list',
                args: {
                    doctype: 'Customer',
                    filters: { mobile_no: frm.doc.mobile },
                    fields: ['name', 'customer_name', 'email_id', 'mobile_no']
                },
                callback: function (response) {
                    if (response.message && response.message.length > 0) {
                        let customer = response.message[0];
                        frm.set_value('customer', customer.name);
                        fetch_customer_details(frm, customer.name);
                    }
                }
            });
        }
    }
});

function create_sales_quotation(frm) {
    frappe.model.with_doctype('Quotation', function () {
        let quotation = frappe.model.get_new_doc('Quotation');
        quotation.quotation_to = 'Customer';
        quotation.party_name = frm.doc.customer;
        quotation.valid_till = frappe.datetime.add_days(frappe.datetime.now_date(), 7);
        quotation.plc_conversion_rate = frm.doc.total_cost;
        quotation.conversion_rate = frm.doc.total_cost;

        // Map Vehicle to quotation Car Details
        quotation.custom_car_details = (frm.doc.car_details || []).map(car => ({
            license_plate: car.license_plate,
            car: car.car,
            fuel_type: car.fuel_type,
            chassis_number: car.chassis_number
        }));

        // Map services to quotation services
        quotation.items = (frm.doc.services || []).map(item => ({
            item_name: item.item,
            qty: item.qty,
            rate: item.item_cost || 0,
            amount: item.total_cost || 0,
            conversion_factor: 1,
            uom: 'Nos'
        }));

        // Calculate and set custom_total_cost
        let custom_total_cost = (frm.doc.services || []).reduce((total, item) => {
            return total + (item.total_cost || 0);
        }, 0);
        quotation.custom_total_cost = custom_total_cost;

        // Open the new Quotation form
        frappe.set_route('Form', 'Quotation', quotation.name);
    });
}

function create_car_repair(frm) {
    frappe.new_doc('Car Repair', {
        car_diagnosis: frm.doc.name,
        customer_name: frm.doc.customer_name,
        customer: frm.doc.customer,
        // car: frm.doc.car,
        // car_manufacturing_year: frm.doc.car_manufacturing_year,
        // technician: frm.doc.technician
    });
}

// ✅ **Function to Fetch Customer Details**
function fetch_customer_details(frm, customer_name) {
    if (customer_name) {
        frappe.call({
            method: 'frappe.client.get',
            args: {
                doctype: 'Customer',
                name: customer_name
            },
            callback: function (response) {
                if (response.message) {
                    frm.set_value('customer_name', response.message.customer_name);
                    frm.set_value('email', response.message.email_id);
                    frm.set_value('mobile', response.message.mobile_no);
                }
            }
        });
    }
}

// ✅ **Prevent Selecting the Same Car Twice & Filter Cars by Customer**
frappe.ui.form.on('Car Info', {
    license_plate: function (frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (row.license_plate) {
            frappe.db.get_doc('Vehicle', row.license_plate).then(vehicle => {
                frappe.model.set_value(cdt, cdn, 'car', vehicle.car_name);
                frappe.model.set_value(cdt, cdn, 'fuel_type', vehicle.fuel_type);
                frappe.model.set_value(cdt, cdn, 'chassis_number', vehicle.chassis_no);
                frm.refresh_field('car_details');
            });
        }
        set_car_filters(frm);
    },

    car_details_add: function (frm, cdt, cdn) {
        set_car_filters(frm);
    },

    car_details_remove: function (frm) {
        set_car_filters(frm);
    }
});

function set_car_filters(frm) {
    frm.fields_dict['car_details'].grid.get_field('license_plate').get_query = function () {
        let selected_cars = (frm.doc.car_details || []).map(row => row.license_plate);
        return {
            filters: [
                ['customer', '=', frm.doc.customer],  // Show only cars belonging to the selected customer
                ['name', 'not in', selected_cars]    // Prevent selecting the same car twice
            ]
        };
    };
}

// ✅ **Prevent Selecting the Same Service Twice**
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
                        frappe.model.set_value(cdt, cdn, 'item_cost', res.message.standard_rate || 0);
                        update_total_cost(frm, cdt, cdn);
                    }
                }
            });
        }
        set_service_filters(frm);
    },
    qty: function (frm, cdt, cdn) {
        update_total_cost(frm, cdt, cdn);
    },
    total_cost: function (frm) {
        calculate_total_cost(frm);
    }
});
function set_service_filters(frm) {
    frm.fields_dict['services'].grid.get_field('item').get_query = function () {
        let selected_item = (frm.doc.services || []).map(row => row.item);
        return {
            filters: [
                ['item_group', '=', 'services'],
                ['name', 'not in', selected_item]
            ]
        };
    };
}
function update_total_cost(frm, cdt, cdn) {
    let row = locals[cdt][cdn];
    let total_cost = (row.qty || 0) * (row.item_cost || 0);
    frappe.model.set_value(cdt, cdn, 'total_cost', total_cost);
    frm.refresh_field('services');
    calculate_total_cost(frm);
}

function calculate_total_cost(frm) {
    let total = 0;
    (frm.doc.services || []).forEach(item => {
        total += item.total_cost || 0;
    });
    frm.set_value('total_cost', total);
}