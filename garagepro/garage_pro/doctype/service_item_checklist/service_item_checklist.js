frappe.ui.form.on('Service Item Checklist', {
    item: function (frm) {
        if (frm.doc.item) {
            frappe.call({
                method: 'frappe.client.get_value',
                args: {
                    doctype: 'Item',
                    filters: { name: frm.doc.item },
                    fieldname: 'valuation_rate'
                },
                callback: function (r) {
                    if (r.message) {
                        frm.set_value('estimate_cost', r.message.valuation_rate * frm.doc.qty);
                    }
                }
            });
        }
    },
    qty: function (frm) {
        if (frm.doc.item) {
            frappe.call({
                method: 'frappe.client.get_value',
                args: {
                    doctype: 'Item',
                    filters: { name: frm.doc.item },
                    fieldname: 'valuation_rate'
                },
                callback: function (r) {
                    if (r.message) {
                        frm.set_value('estimate_cost', r.message.valuation_rate * frm.doc.qty);
                    }
                }
            });
        }
    }
});