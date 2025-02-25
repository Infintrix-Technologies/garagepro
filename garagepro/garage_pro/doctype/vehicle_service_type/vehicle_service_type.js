// Copyright (c) 2025, infintrixtech.com and contributors
// For license information, please see license.txt

frappe.ui.form.on("Vehicle Service Type", {
    refresh(frm) {
        calculate_total_parts_cost(frm);
    },

    service_fee: function (frm) {
        calculate_estimate_cost(frm);
    }
});

// Trigger when "item" or "qty" changes in the child table
frappe.ui.form.on("Service Item Checklist", {
    item: function (frm, cdt, cdn) {
        update_estimate_cost(frm, cdt, cdn);
    },

    qty: function (frm, cdt, cdn) {
        update_estimate_cost(frm, cdt, cdn);
    }
});

// Function to fetch valuation_rate and update estimate_cost in child table
function update_estimate_cost(frm, cdt, cdn) {
    let row = locals[cdt][cdn];
    if (row.item) {
        frappe.db.get_value('Item', row.item, 'valuation_rate', (r) => {
            if (r.valuation_rate) {
                frappe.model.set_value(cdt, cdn, 'estimate_cost', r.valuation_rate * row.qty);
                calculate_total_parts_cost(frm);
            }
        });
    }
}

// Function to calculate total parts cost
function calculate_total_parts_cost(frm) {
    let total_cost = 0;
    (frm.doc.spare_parts || []).forEach(row => {
        total_cost += row.estimate_cost || 0;
    });
    frm.set_value('parts_cost', total_cost);
    calculate_estimate_cost(frm);  // Call function to update final estimate_cost
}

// Function to calculate final estimate_cost
function calculate_estimate_cost(frm) {
    let service_fee = frm.doc.service_fee || 0;
    let parts_cost = frm.doc.parts_cost || 0;
    frm.set_value('estimate_cost', service_fee + parts_cost);
}
