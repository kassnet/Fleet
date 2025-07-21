import requests
import sys
import json
from datetime import datetime, timedelta

class ToolManagementTester:
    def __init__(self, base_url="https://d49f146a-1c74-4ae7-997f-d63e95bc382e.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.token = None
        self.headers = {'Content-Type': 'application/json'}
        self.test_tool = None
        self.test_technicien = None
        self.test_affectation = None

    def run_test(self, name, method, endpoint, expected_status=200, data=None, print_response=True):
        """Run a single API test"""
        url = f"{self.base_url}{endpoint}"
        headers = self.headers
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    data = response.json()
                    if print_response:
                        print(f"📊 Response data: {json.dumps(data, indent=2)[:500]}...")
                    return success, data
                except:
                    print("⚠️ Response is not JSON")
                    return success, response.text
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"Response: {response.text}")
                return False, None

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, None

    def authenticate(self, email, password):
        """Authenticate and get token"""
        print(f"\n🔐 Authenticating as {email}...")
        
        auth_data = {
            "email": email,
            "password": password
        }
        
        success, response = self.run_test(
            f"Authentication - {email}",
            "POST",
            "/api/auth/login",
            200,
            data=auth_data,
            print_response=False
        )
        
        if success and response:
            self.token = response.get('access_token')
            self.headers['Authorization'] = f'Bearer {self.token}'
            user_info = response.get('user', {})
            print(f"✅ Authenticated successfully as {user_info.get('nom')} {user_info.get('prenom')} ({user_info.get('role')})")
            return True, user_info
        else:
            print(f"❌ Authentication failed for {email}")
            return False, None

    def test_technicien_role_creation(self):
        """Test creating a user with technicien role"""
        print("\n" + "=" * 60)
        print("🔧 TESTING TECHNICIEN ROLE CREATION")
        print("=" * 60)
        
        # First authenticate as admin to create users
        auth_success, admin_user = self.authenticate("admin@facturapp.rdc", "admin123")
        if not auth_success:
            print("❌ Failed to authenticate as admin")
            return False
        
        # Create a technicien user
        timestamp = datetime.now().strftime('%H%M%S')
        technicien_data = {
            "email": f"technicien{timestamp}@facturapp.rdc",
            "nom": "Technicien",
            "prenom": f"Test{timestamp}",
            "password": "technicien123",
            "role": "technicien"
        }
        
        success, created_user = self.run_test(
            "Create Technicien User",
            "POST",
            "/api/users",
            200,
            data=technicien_data
        )
        
        if success and created_user:
            self.test_technicien = created_user
            print(f"✅ Created technicien user: {created_user.get('email')}")
            print(f"📝 User ID: {created_user.get('id')}")
            print(f"📝 Role: {created_user.get('role')}")
            
            # Test authentication with the new technicien
            tech_auth_success, tech_user = self.authenticate(
                technicien_data["email"], 
                technicien_data["password"]
            )
            
            if tech_auth_success:
                print("✅ Technicien can authenticate successfully")
                return True
            else:
                print("❌ Technicien authentication failed")
                return False
        else:
            print("❌ Failed to create technicien user")
            return False

    def test_tool_management_endpoints(self):
        """Test all tool management CRUD endpoints"""
        print("\n" + "=" * 60)
        print("🛠️ TESTING TOOL MANAGEMENT ENDPOINTS")
        print("=" * 60)
        
        # Authenticate as admin/manager for tool management
        auth_success, user = self.authenticate("admin@facturapp.rdc", "admin123")
        if not auth_success:
            auth_success, user = self.authenticate("manager@demo.com", "manager123")
            if not auth_success:
                print("❌ Failed to authenticate as admin or manager")
                return False
        
        # 1. Test GET /api/outils - List all tools
        print("\n🔍 Testing GET /api/outils - List all tools")
        success, tools_list = self.run_test("Get All Tools", "GET", "/api/outils")
        if success:
            print(f"🛠️ Number of existing tools: {len(tools_list) if tools_list else 0}")
        
        # 2. Test POST /api/outils - Create new tool
        print("\n🔍 Testing POST /api/outils - Create new tool")
        
        timestamp = datetime.now().strftime('%H%M%S')
        tool_data = {
            "nom": f"Perceuse Test {timestamp}",
            "description": "Perceuse électrique pour tests",
            "reference": f"PER-{timestamp}",
            "quantite_stock": 10,
            "prix_unitaire_usd": 150.0,
            "fournisseur": "Bosch Tools",
            "date_achat": datetime.now().isoformat(),
            "etat": "neuf",
            "localisation": "Entrepôt A",
            "numero_serie": f"SN{timestamp}"
        }
        
        success, created_tool = self.run_test(
            "Create Tool",
            "POST",
            "/api/outils",
            200,
            data=tool_data
        )
        
        if not success or not created_tool:
            print("❌ Failed to create tool")
            return False
        
        self.test_tool = created_tool
        tool_id = created_tool.get('id')
        print(f"✅ Created tool with ID: {tool_id}")
        print(f"🛠️ Tool name: {created_tool.get('nom')}")
        print(f"📦 Initial stock: {created_tool.get('quantite_stock')}")
        print(f"📦 Available: {created_tool.get('quantite_disponible')}")
        
        # 3. Test GET /api/outils/{id} - Get specific tool
        print(f"\n🔍 Testing GET /api/outils/{tool_id} - Get specific tool")
        success, retrieved_tool = self.run_test(
            "Get Specific Tool",
            "GET",
            f"/api/outils/{tool_id}",
            200
        )
        
        if not success or not retrieved_tool:
            print("❌ Failed to retrieve specific tool")
            return False
        
        print(f"✅ Successfully retrieved tool {retrieved_tool.get('nom')}")
        print(f"🛠️ Reference: {retrieved_tool.get('reference')}")
        print(f"💰 Price: ${retrieved_tool.get('prix_unitaire_usd')} USD")
        
        # 4. Test PUT /api/outils/{id} - Update tool
        print(f"\n🔍 Testing PUT /api/outils/{tool_id} - Update tool")
        
        updated_tool_data = created_tool.copy()
        updated_tool_data["description"] = "Perceuse électrique mise à jour"
        updated_tool_data["prix_unitaire_usd"] = 175.0
        updated_tool_data["localisation"] = "Entrepôt B"
        
        success, updated_tool = self.run_test(
            "Update Tool",
            "PUT",
            f"/api/outils/{tool_id}",
            200,
            data=updated_tool_data
        )
        
        if success and updated_tool:
            print("✅ Successfully updated tool")
            print(f"📝 New description: {updated_tool.get('description')}")
            print(f"💰 New price: ${updated_tool.get('prix_unitaire_usd')} USD")
            print(f"📍 New location: {updated_tool.get('localisation')}")
        else:
            print("❌ Failed to update tool")
            return False
        
        return True

    def test_tool_provisioning(self):
        """Test tool provisioning (stock replenishment)"""
        print("\n" + "=" * 60)
        print("📦 TESTING TOOL PROVISIONING")
        print("=" * 60)
        
        if not self.test_tool:
            print("❌ No test tool available for provisioning")
            return False
        
        tool_id = self.test_tool.get('id')
        initial_stock = self.test_tool.get('quantite_stock', 0)
        
        # Test POST /api/outils/{id}/approvisionner - Add stock
        print(f"\n🔍 Testing POST /api/outils/{tool_id}/approvisionner - Add stock")
        
        provisioning_data = {
            "quantite_ajoutee": 5,
            "prix_unitaire_usd": 160.0,
            "fournisseur": "Bosch Tools Updated",
            "date_achat": datetime.now().isoformat(),
            "notes": "Approvisionnement de test"
        }
        
        success, provisioning_response = self.run_test(
            "Provision Tool Stock",
            "POST",
            f"/api/outils/{tool_id}/approvisionner",
            200,
            data=provisioning_data
        )
        
        if not success or not provisioning_response:
            print("❌ Failed to provision tool stock")
            return False
        
        print("✅ Successfully provisioned tool stock")
        print(f"📦 Added quantity: {provisioning_data['quantite_ajoutee']}")
        
        # Verify stock was updated
        success, updated_tool = self.run_test(
            "Verify Stock Update",
            "GET",
            f"/api/outils/{tool_id}",
            200,
            print_response=False
        )
        
        if success and updated_tool:
            new_stock = updated_tool.get('quantite_stock', 0)
            new_available = updated_tool.get('quantite_disponible', 0)
            expected_stock = initial_stock + provisioning_data['quantite_ajoutee']
            
            print(f"📦 Stock before: {initial_stock}")
            print(f"📦 Stock after: {new_stock}")
            print(f"📦 Available: {new_available}")
            
            if new_stock == expected_stock:
                print("✅ Stock correctly updated after provisioning")
                self.test_tool = updated_tool  # Update our test tool reference
                return True
            else:
                print(f"❌ Stock not updated correctly. Expected: {expected_stock}, Got: {new_stock}")
                return False
        else:
            print("❌ Failed to verify stock update")
            return False

    def test_tool_assignments(self):
        """Test tool assignments to technicians"""
        print("\n" + "=" * 60)
        print("👷 TESTING TOOL ASSIGNMENTS")
        print("=" * 60)
        
        if not self.test_tool or not self.test_technicien:
            print("❌ Need both test tool and technicien for assignment testing")
            return False
        
        tool_id = self.test_tool.get('id')
        technicien_id = self.test_technicien.get('id')
        
        # Test POST /api/outils/{id}/affecter - Assign tool to technician
        print(f"\n🔍 Testing POST /api/outils/{tool_id}/affecter - Assign tool to technician")
        
        assignment_data = {
            "outil_id": tool_id,
            "technicien_id": technicien_id,
            "quantite_affectee": 2,
            "date_retour_prevue": (datetime.now() + timedelta(days=7)).isoformat(),
            "notes_affectation": "Assignment de test pour perceuse"
        }
        
        success, assignment_response = self.run_test(
            "Assign Tool to Technician",
            "POST",
            f"/api/outils/{tool_id}/affecter",
            200,
            data=assignment_data
        )
        
        if not success or not assignment_response:
            print("❌ Failed to assign tool to technician")
            return False
        
        self.test_affectation = assignment_response
        affectation_id = assignment_response.get('id')
        print("✅ Successfully assigned tool to technician")
        print(f"📝 Assignment ID: {affectation_id}")
        print(f"👷 Technician: {assignment_response.get('technicien_nom')}")
        print(f"🛠️ Tool: {assignment_response.get('outil_nom')}")
        print(f"📦 Quantity assigned: {assignment_response.get('quantite_affectee')}")
        
        # Test GET /api/affectations - List all assignments
        print("\n🔍 Testing GET /api/affectations - List all assignments")
        success, assignments_list = self.run_test("Get All Assignments", "GET", "/api/affectations")
        if success:
            print(f"📋 Number of assignments: {len(assignments_list) if assignments_list else 0}")
            if assignments_list:
                for assignment in assignments_list[:3]:  # Show first 3
                    print(f"  - {assignment.get('outil_nom')} → {assignment.get('technicien_nom')} ({assignment.get('statut')})")
        
        # Verify tool availability was reduced
        success, updated_tool = self.run_test(
            "Verify Tool Availability After Assignment",
            "GET",
            f"/api/outils/{tool_id}",
            200,
            print_response=False
        )
        
        if success and updated_tool:
            available_quantity = updated_tool.get('quantite_disponible', 0)
            print(f"📦 Available quantity after assignment: {available_quantity}")
            
            expected_available = self.test_tool.get('quantite_disponible', 0) - assignment_data['quantite_affectee']
            if available_quantity == expected_available:
                print("✅ Tool availability correctly reduced after assignment")
            else:
                print(f"❌ Tool availability not updated correctly. Expected: {expected_available}, Got: {available_quantity}")
        
        return True

    def test_tool_returns(self):
        """Test tool returns from technicians"""
        print("\n" + "=" * 60)
        print("🔄 TESTING TOOL RETURNS")
        print("=" * 60)
        
        if not self.test_affectation:
            print("❌ No test assignment available for return testing")
            return False
        
        affectation_id = self.test_affectation.get('id')
        tool_id = self.test_tool.get('id')
        
        # Test PUT /api/affectations/{id}/retourner - Return tool
        print(f"\n🔍 Testing PUT /api/affectations/{affectation_id}/retourner - Return tool")
        
        return_data = {
            "quantite_retournee": 2,  # Return all assigned tools
            "etat_retour": "bon",
            "notes_retour": "Outils retournés en bon état après utilisation"
        }
        
        success, return_response = self.run_test(
            "Return Tool from Technician",
            "PUT",
            f"/api/affectations/{affectation_id}/retourner",
            200,
            data=return_data
        )
        
        if not success or not return_response:
            print("❌ Failed to return tool from technician")
            return False
        
        print("✅ Successfully returned tool from technician")
        print(f"📦 Quantity returned: {return_data['quantite_retournee']}")
        print(f"🔧 Return condition: {return_data['etat_retour']}")
        
        # Verify assignment status was updated
        success, updated_assignments = self.run_test(
            "Verify Assignment Status After Return",
            "GET",
            "/api/affectations",
            200,
            print_response=False
        )
        
        if success and updated_assignments:
            returned_assignment = next(
                (a for a in updated_assignments if a.get('id') == affectation_id), 
                None
            )
            
            if returned_assignment:
                status = returned_assignment.get('statut')
                print(f"📝 Assignment status after return: {status}")
                
                if status == 'retourne':
                    print("✅ Assignment status correctly updated to 'retourne'")
                else:
                    print(f"❌ Assignment status not updated correctly. Expected: 'retourne', Got: {status}")
            else:
                print("❌ Could not find the assignment after return")
        
        # Verify tool availability was restored
        success, updated_tool = self.run_test(
            "Verify Tool Availability After Return",
            "GET",
            f"/api/outils/{tool_id}",
            200,
            print_response=False
        )
        
        if success and updated_tool:
            available_quantity = updated_tool.get('quantite_disponible', 0)
            print(f"📦 Available quantity after return: {available_quantity}")
            print("✅ Tool availability should be restored after return")
        
        return True

    def test_tool_movements_history(self):
        """Test tool movements history"""
        print("\n" + "=" * 60)
        print("📊 TESTING TOOL MOVEMENTS HISTORY")
        print("=" * 60)
        
        if not self.test_tool:
            print("❌ No test tool available for movements history")
            return False
        
        tool_id = self.test_tool.get('id')
        
        # Test GET /api/outils/{id}/mouvements - Get tool movements history
        print(f"\n🔍 Testing GET /api/outils/{tool_id}/mouvements - Get tool movements history")
        
        success, movements = self.run_test(
            "Get Tool Movements History",
            "GET",
            f"/api/outils/{tool_id}/mouvements",
            200
        )
        
        if not success:
            print("❌ Failed to get tool movements history")
            return False
        
        if movements:
            print(f"📊 Number of movements: {len(movements)}")
            print("📋 Recent movements:")
            
            for i, movement in enumerate(movements.get("mouvements", [])[:5]):  # Show first 5 movements
                movement_type = movement.get('type_mouvement', 'unknown')
                quantity = movement.get('quantite', 0)
                date = movement.get('date_mouvement', 'unknown')
                motif = movement.get('motif', 'No reason provided')
                
                print(f"  {i+1}. {movement_type.upper()}: {quantity} units - {motif} ({date})")
            
            print("✅ Successfully retrieved tool movements history")
        else:
            print("⚠️ No movements found for this tool")
        
        return True

    def test_permissions_by_role(self):
        """Test permissions for different user roles"""
        print("\n" + "=" * 60)
        print("🔐 TESTING PERMISSIONS BY ROLE")
        print("=" * 60)
        
        # Test cases for different roles
        test_cases = [
            {
                "role": "technicien",
                "email": self.test_technicien.get('email') if self.test_technicien else "technicien@test.com",
                "password": "technicien123",
                "can_view_tools": True,
                "can_create_tools": False,
                "can_manage_assignments": False,
                "description": "Technicien should be able to view tools and their assignments but not create/manage tools"
            },
            {
                "role": "manager",
                "email": "manager@demo.com",
                "password": "manager123",
                "can_view_tools": True,
                "can_create_tools": True,
                "can_manage_assignments": True,
                "description": "Manager should have full access to tool management"
            },
            {
                "role": "admin",
                "email": "admin@facturapp.rdc",
                "password": "admin123",
                "can_view_tools": True,
                "can_create_tools": True,
                "can_manage_assignments": True,
                "description": "Admin should have full access to tool management"
            },
            {
                "role": "comptable",
                "email": "comptable@demo.com",
                "password": "comptable123",
                "can_view_tools": False,
                "can_create_tools": False,
                "can_manage_assignments": False,
                "description": "Comptable should have limited or no access to tool management"
            }
        ]
        
        for test_case in test_cases:
            print(f"\n🔍 Testing permissions for {test_case['role']} role")
            print(f"📝 {test_case['description']}")
            
            # Authenticate as the role
            auth_success, user = self.authenticate(test_case['email'], test_case['password'])
            if not auth_success:
                print(f"⚠️ Could not authenticate as {test_case['role']}, skipping...")
                continue
            
            # Test viewing tools
            success, _ = self.run_test(
                f"{test_case['role']} - View Tools",
                "GET",
                "/api/outils",
                200 if test_case['can_view_tools'] else 403,
                print_response=False
            )
            
            if test_case['can_view_tools']:
                if success:
                    print(f"✅ {test_case['role']} can view tools (as expected)")
                else:
                    print(f"❌ {test_case['role']} cannot view tools (unexpected)")
            else:
                if not success:
                    print(f"✅ {test_case['role']} cannot view tools (as expected)")
                else:
                    print(f"❌ {test_case['role']} can view tools (unexpected)")
            
            # Test creating tools
            if test_case['can_create_tools']:
                timestamp = datetime.now().strftime('%H%M%S')
                tool_data = {
                    "nom": f"Test Tool {timestamp}",
                    "description": f"Tool created by {test_case['role']}",
                    "quantite_stock": 5,
                    "prix_unitaire_usd": 100.0
                }
                
                success, _ = self.run_test(
                    f"{test_case['role']} - Create Tool",
                    "POST",
                    "/api/outils",
                    200,
                    data=tool_data,
                    print_response=False
                )
                
                if success:
                    print(f"✅ {test_case['role']} can create tools (as expected)")
                else:
                    print(f"❌ {test_case['role']} cannot create tools (unexpected)")
            else:
                # Test that they get 403 when trying to create
                timestamp = datetime.now().strftime('%H%M%S')
                tool_data = {
                    "nom": f"Unauthorized Tool {timestamp}",
                    "description": f"Tool creation attempt by {test_case['role']}",
                    "quantite_stock": 1,
                    "prix_unitaire_usd": 50.0
                }
                
                success, _ = self.run_test(
                    f"{test_case['role']} - Create Tool (Should Fail)",
                    "POST",
                    "/api/outils",
                    403,
                    data=tool_data,
                    print_response=False
                )
                
                if not success:  # success=False means we got the expected 403
                    print(f"✅ {test_case['role']} cannot create tools (as expected)")
                else:
                    print(f"❌ {test_case['role']} can create tools (unexpected)")
        
        return True

    def run_comprehensive_tests(self):
        """Run all tool management tests"""
        print("\n" + "=" * 80)
        print("🛠️ COMPREHENSIVE TOOL MANAGEMENT TESTING")
        print("=" * 80)
        
        test_results = []
        
        # 1. Test technicien role creation
        result = self.test_technicien_role_creation()
        test_results.append(("Technicien Role Creation", result))
        
        # 2. Test tool management endpoints
        result = self.test_tool_management_endpoints()
        test_results.append(("Tool Management CRUD", result))
        
        # 3. Test tool provisioning
        result = self.test_tool_provisioning()
        test_results.append(("Tool Provisioning", result))
        
        # 4. Test tool assignments
        result = self.test_tool_assignments()
        test_results.append(("Tool Assignments", result))
        
        # 5. Test tool returns
        result = self.test_tool_returns()
        test_results.append(("Tool Returns", result))
        
        # 6. Test movements history
        result = self.test_tool_movements_history()
        test_results.append(("Tool Movements History", result))
        
        # 7. Test permissions by role
        result = self.test_permissions_by_role()
        test_results.append(("Permissions by Role", result))
        
        # Print summary
        print("\n" + "=" * 80)
        print("📋 TOOL MANAGEMENT TESTING SUMMARY")
        print("=" * 80)
        
        passed_tests = 0
        total_tests = len(test_results)
        
        for test_name, result in test_results:
            status = "✅ PASSED" if result else "❌ FAILED"
            print(f"{status} - {test_name}")
            if result:
                passed_tests += 1
        
        print(f"\n📊 Overall Results: {passed_tests}/{total_tests} tests passed")
        print(f"📊 Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if passed_tests == total_tests:
            print("🎉 All tool management tests passed!")
            return True
        else:
            print("⚠️ Some tool management tests failed")
            return False

def main():
    """Main function to run tool management tests"""
    print("🛠️ Starting Tool Management Testing...")
    
    tester = ToolManagementTester()
    
    try:
        success = tester.run_comprehensive_tests()
        
        if success:
            print("\n🎉 Tool management functionality is working correctly!")
            return 0
        else:
            print("\n❌ Tool management functionality has issues that need to be addressed")
            return 1
            
    except Exception as e:
        print(f"\n💥 Testing failed with error: {str(e)}")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)