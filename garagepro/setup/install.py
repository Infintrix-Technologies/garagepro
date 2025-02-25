from frappe.core.page.permission_manager import permission_manager
import frappe

allowed_resources = {
    "Service Manager": {
        "Car Diagnosis": [
            # "select",
            "create",
            # "write",
            "read",
            # "delete",
            # "email",
            # "export",
            # "share",
            # "report",
            # "print",
            # "import",
        ],
        "Car Repair": [
            # "select",
            "create",
            # "write",
            "read",
            # "delete",
            # "email",
            # "export",
            # "share",
            # "report",
            # "print",
            # "import",
        ],
        "Vehicle": [
            # "select",
            "create",
            # "write",
            "read",
            # "delete",
            # "email",
            # "export",
            # "share",
            # "report",
            # "print",
            # "import",
        ],
        "Customer": [
            # "select",
            "create",
            # "write",
            "read",
            # "delete",
            # "email",
            # "export",
            # "share",
            # "report",
            # "print",
            # "import",
        ],
    }
}


def setup_roles_and_permissions():
    roles_list = list(allowed_resources.keys())
    print("Creating roles", roles_list)
    for role_name in roles_list:
        # Check if the role already exists
        if not frappe.db.exists("Role", role_name):
            role = frappe.get_doc({
                "doctype": "Role",
                "role_name": role_name,
                "home_page": "/app"
            })

            role.insert(ignore_permissions=True)
            frappe.db.commit()
            print(f"\tRole '{role_name}' created successfully.")
        else:
            print(f"\tRole '{role_name}' already exists.")

        print("\t\tcreating permissions for role", role_name)

        doctypes_list = list(allowed_resources[role_name].keys())
        for doctype in doctypes_list:
            permission_manager.add(parent=doctype, role=role_name, permlevel=0)
            for perm_type in allowed_resources[role_name][doctype]:
                permission_manager.update(
                    role=role_name,
                    permlevel=0,
                    doctype=doctype,
                    ptype=perm_type,
                    value=1,
                    if_owner=0,
                )

    # remove_allowed_perms_to_guests = ["export", "read"]
    # for doctype in doctypes_list:
    #     for perm_type in remove_allowed_perms_to_guests:
    #         permission_manager.update(
    #             role="Guest",
    #             permlevel=0,
    #             doctype=doctype,
    #             ptype=perm_type,
    #             value=0,
    #             if_owner=0,
    #         )


def setup_master_data():

    if not frappe.db.exists("Designation", 'Service Manager'):
        doc = frappe.get_doc({
            "doctype": "Designation",
            "designation": 'Service Manager'
        })

        doc.insert(ignore_permissions=True)
        frappe.db.commit()

    if not frappe.db.exists("Designation", 'Technician'):
        doc = frappe.get_doc({
            "doctype": "Designation",
            "designation": 'Technician'
        })

        doc.insert(ignore_permissions=True)
        frappe.db.commit()

    # def remove_guests_permissions():
    #     doctypes_list = ["Payment", "Reservation", "Guest"]
    #     for doctype in doctypes_list:
    #         permission_manager.remove(
    #             doctype=doctype, role="Guest", permlevel=0, if_owner=0
    #         )

    # def setup_tablesuite_staff_role_permissions():

    #     print("Setting permissions for staff")

    #     role_name = "Tablesuite Staff"

    #     create_tablesuite_staff_role(role_name)

    #     doctypes_list = [
    #         "Payment",
    #         "Meal Slot",
    #         "Reservation",
    #         "Guest",
    #         "Table",
    #         "Table Suite Settings",
    #         "Meal Type Setting",
    #         "Restaurant Menu",
    #         "Menu Category",
    #         "Menu Item",
    #         "Item Allergen",
    #         "Menu Items",
    #         "Allergen",
    #     ]
    #     add_allowed_perms_to_staff = [
    #         "select",
    #         "create",
    #         "write",
    #         "read",
    #         "delete",
    #         "email",
    #         "export",
    #         "share",
    #         "report",
    #         "print",
    #         "import",
    #     ]
    #     for doctype in doctypes_list:
    #         permission_manager.add(parent=doctype, role=role_name, permlevel=0)

    #         for perm_type in add_allowed_perms_to_staff:
    #             permission_manager.update(
    #                 role=role_name,
    #                 permlevel=0,
    #                 doctype=doctype,
    #                 ptype=perm_type,
    #                 value=1,
    #                 if_owner=0,
    #             )


def after_install():
    setup_roles_and_permissions()
    setup_master_data()
    print("GaragePro app installed successfully.")
    frappe.clear_cache()
    print("Cache cleared.")
    print("GaragePro app setup completed.")


def before_uninstall():
    pass
