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
        quotation.plc_conversion_rate = frm.doc.total_cost
        quotation.conversion_rate = frm.doc.total_cost

        // Map services to quotation items
        quotation.items = (frm.doc.services || []).map(service => ({
            item_name: service.service,
            qty: 1,
            rate: service.estimate_cost || 0,
            amount: service.estimate_cost || 0,
            conversion_factor: 1,
            uom: 'Nos'
        }));

        // Open the new Quotation form
        frappe.set_route('Form', 'Quotation', quotation.name);
    });
}

function create_car_repair(frm) {
    frappe.new_doc('Car Repair', {
        car_diagnosis: frm.doc.name,
        customer_name: frm.doc.customer_name,
        customer: frm.doc.customer,
        car: frm.doc.car,
        car_manufacturing_year: frm.doc.car_manufacturing_year,
        technician: frm.doc.technician
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

// ✅ **Function to Filter Available Cars**
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
frappe.ui.form.on('Services Child', {
    service: function (frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (row.service) {
            frappe.call({
                method: 'frappe.client.get',
                args: {
                    doctype: 'Vehicle Service Type',
                    name: row.service
                },
                callback: function (res) {
                    if (res.message) {
                        frappe.model.set_value(cdt, cdn, 'estimate_cost', res.message.estimate_cost || 0);
                        frappe.model.set_value(cdt, cdn, 'estimate_time', res.message.estimate_time || 0);
                        frm.refresh_field("services");
                        update_total_cost(frm);
                    }
                }
            });
        }
    },

    estimate_cost: function (frm, cdt, cdn) {
        update_total_cost(frm);
    },

    services_remove: function (frm) {
        update_total_cost(frm);
    }
});

// ✅ **Function to Update Total Cost Field**
function update_total_cost(frm) {
    let total = 0;
    (frm.doc.services || []).forEach(row => {
        total += flt(row.estimate_cost || 0);
    });

    frm.set_value('total_cost', total);
    frm.refresh_field('total_cost');
}
