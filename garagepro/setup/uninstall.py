import frappe
from frappe.core.page.permission_manager import permission_manager

roles_to_remove = ["Service Manager"]

designations_to_remove = ["Service Manager", "Technician"]

doctypes_to_remove_permissions = [
    "Car Diagnosis", "Car Repair", "Vehicle", "Customer"]


def remove_roles_and_permissions():
    print("Removing roles and permissions...")

    for role_name in roles_to_remove:
        if frappe.db.exists("Role", role_name):
            for doctype in doctypes_to_remove_permissions:
                permission_manager.remove(
                    doctype=doctype, role=role_name, permlevel=0, if_owner=0)

            frappe.delete_doc("Role", role_name, force=True)
            frappe.db.commit()
            print(
                f"\tRole '{role_name}' and its permissions removed successfully.")
        else:
            print(f"\tRole '{role_name}' does not exist.")


def remove_designations():
    print("Removing designations...")

    for designation in designations_to_remove:
        if frappe.db.exists("Designation", designation):
            frappe.delete_doc("Designation", designation, force=True)
            frappe.db.commit()
            print(f"\tDesignation '{designation}' removed successfully.")
        else:
            print(f"\tDesignation '{designation}' does not exist.")


def before_uninstall():
    remove_roles_and_permissions()
    remove_designations()
    print("GaragePro app uninstalled successfully.")
    frappe.clear_cache()
    print("Cache cleared.")
    print("GaragePro app cleanup completed.")
