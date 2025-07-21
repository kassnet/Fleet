import requests
import json
from datetime import datetime

class ToolAssignmentTester:
    def __init__(self, base_url="https://d49f146a-1c74-4ae7-997f-d63e95bc382e.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.headers = {'Content-Type': 'application/json'}

    def authenticate(self, email="admin@facturapp.rdc", password="admin123"):
        """Authenticate and get token"""
        print(f"🔐 Authenticating as {email}...")
        
        auth_data = {
            "email": email,
            "password": password
        }
        
        try:
            response = requests.post(f"{self.base_url}/api/auth/login", json=auth_data)
            if response.status_code == 200:
                data = response.json()
                self.token = data.get('access_token')
                self.headers['Authorization'] = f'Bearer {self.token}'
                print(f"✅ Authentication successful")
                print(f"👤 User: {data.get('user', {}).get('nom')} {data.get('user', {}).get('prenom')}")
                print(f"🎭 Role: {data.get('user', {}).get('role')}")
                return True
            else:
                print(f"❌ Authentication failed: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            print(f"❌ Authentication error: {str(e)}")
            return False

    def get_tools(self):
        """Get all tools"""
        print("\n🔧 Getting all tools...")
        try:
            response = requests.get(f"{self.base_url}/api/outils", headers=self.headers)
            if response.status_code == 200:
                tools = response.json()
                print(f"✅ Found {len(tools)} tools")
                for tool in tools:
                    print(f"  - {tool.get('nom')} (Ref: {tool.get('reference')}) - Stock: {tool.get('quantite_stock')}/{tool.get('quantite_disponible')}")
                return tools
            else:
                print(f"❌ Failed to get tools: {response.status_code} - {response.text}")
                return []
        except Exception as e:
            print(f"❌ Error getting tools: {str(e)}")
            return []

    def get_users(self):
        """Get all users"""
        print("\n👥 Getting all users...")
        try:
            response = requests.get(f"{self.base_url}/api/users", headers=self.headers)
            if response.status_code == 200:
                users = response.json()
                print(f"✅ Found {len(users)} users")
                for user in users:
                    print(f"  - {user.get('nom')} {user.get('prenom')} ({user.get('email')}) - Role: {user.get('role')}")
                return users
            else:
                print(f"❌ Failed to get users: {response.status_code} - {response.text}")
                return []
        except Exception as e:
            print(f"❌ Error getting users: {str(e)}")
            return []

    def find_tool_by_reference(self, tools, reference):
        """Find tool by reference"""
        for tool in tools:
            if tool.get('reference') == reference:
                return tool
        return None

    def find_user_by_name(self, users, name):
        """Find user by name (partial match)"""
        for user in users:
            full_name = f"{user.get('nom', '')} {user.get('prenom', '')}".strip()
            if name.lower() in full_name.lower():
                return user
        return None

    def test_tool_assignment(self, tool_id, technicien_id, quantite=5):
        """Test tool assignment"""
        print(f"\n🔧 Testing tool assignment...")
        print(f"Tool ID: {tool_id}")
        print(f"Technician ID: {technicien_id}")
        print(f"Quantity: {quantite}")
        
        assignment_data = {
            "outil_id": tool_id,
            "technicien_id": technicien_id,
            "quantite_affectee": quantite,
            "notes_affectation": "Test assignment from diagnostic"
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/api/outils/{tool_id}/affecter", 
                json=assignment_data, 
                headers=self.headers
            )
            
            print(f"📊 Response Status: {response.status_code}")
            print(f"📊 Response Headers: {dict(response.headers)}")
            
            try:
                response_data = response.json()
                print(f"📊 Response Data: {json.dumps(response_data, indent=2)}")
            except:
                print(f"📊 Response Text: {response.text}")
            
            if response.status_code == 200:
                print("✅ Tool assignment successful!")
                return True, response_data if 'response_data' in locals() else None
            else:
                print(f"❌ Tool assignment failed with status {response.status_code}")
                return False, response_data if 'response_data' in locals() else response.text
                
        except Exception as e:
            print(f"❌ Error during tool assignment: {str(e)}")
            return False, str(e)

    def test_simplified_assignment(self, tool_id, technicien_id):
        """Test with minimal data"""
        print(f"\n🔧 Testing simplified tool assignment...")
        
        assignment_data = {
            "technicien_id": technicien_id,
            "quantite_affectee": 1
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/api/outils/{tool_id}/affecter", 
                json=assignment_data, 
                headers=self.headers
            )
            
            print(f"📊 Response Status: {response.status_code}")
            
            try:
                response_data = response.json()
                print(f"📊 Response Data: {json.dumps(response_data, indent=2)}")
            except:
                print(f"📊 Response Text: {response.text}")
            
            if response.status_code == 200:
                print("✅ Simplified tool assignment successful!")
                return True, response_data if 'response_data' in locals() else None
            else:
                print(f"❌ Simplified tool assignment failed with status {response.status_code}")
                return False, response_data if 'response_data' in locals() else response.text
                
        except Exception as e:
            print(f"❌ Error during simplified tool assignment: {str(e)}")
            return False, str(e)

    def run_diagnostic(self):
        """Run complete diagnostic"""
        print("=" * 80)
        print("🔍 TOOL ASSIGNMENT DIAGNOSTIC - 422 ERROR INVESTIGATION")
        print("=" * 80)
        
        # Step 1: Authenticate
        if not self.authenticate():
            return False
        
        # Step 2: Get existing data
        tools = self.get_tools()
        users = self.get_users()
        
        if not tools or not users:
            print("❌ Cannot proceed without tools and users data")
            return False
        
        # Step 3: Find TAT100 tool
        tat100_tool = self.find_tool_by_reference(tools, "TAT100")
        if not tat100_tool:
            print("❌ Tool TAT100 not found")
            print("Available tools:")
            for tool in tools[:5]:  # Show first 5 tools
                print(f"  - {tool.get('nom')} (Ref: {tool.get('reference')})")
            # Use first available tool for testing
            tat100_tool = tools[0] if tools else None
            if tat100_tool:
                print(f"🔄 Using first available tool for testing: {tat100_tool.get('nom')} (Ref: {tat100_tool.get('reference')})")
        else:
            print(f"✅ Found TAT100 tool: {tat100_tool.get('nom')}")
        
        # Step 4: Find Israël Kanda user
        israel_user = self.find_user_by_name(users, "Israël Kanda")
        if not israel_user:
            print("❌ User 'Israël Kanda' not found")
            print("Available users:")
            for user in users[:5]:  # Show first 5 users
                full_name = f"{user.get('nom', '')} {user.get('prenom', '')}".strip()
                print(f"  - {full_name} ({user.get('email')}) - Role: {user.get('role')}")
            
            # Find any technician for testing
            technicians = [u for u in users if u.get('role') == 'technicien']
            if technicians:
                israel_user = technicians[0]
                full_name = f"{israel_user.get('nom', '')} {israel_user.get('prenom', '')}".strip()
                print(f"🔄 Using first available technician for testing: {full_name}")
            else:
                print("❌ No technicians found")
                return False
        else:
            print(f"✅ Found Israël Kanda: {israel_user.get('email')}")
        
        if not tat100_tool or not israel_user:
            print("❌ Missing required data for testing")
            return False
        
        tool_id = tat100_tool.get('id')
        technicien_id = israel_user.get('id')
        
        print(f"\n📋 Test Parameters:")
        print(f"Tool: {tat100_tool.get('nom')} (ID: {tool_id})")
        print(f"Technician: {israel_user.get('nom')} {israel_user.get('prenom')} (ID: {technicien_id})")
        print(f"Available Stock: {tat100_tool.get('quantite_disponible')}")
        
        # Step 5: Test the problematic assignment
        print(f"\n🔍 STEP 5: Testing problematic assignment (quantity 5)")
        success1, result1 = self.test_tool_assignment(tool_id, technicien_id, 5)
        
        # Step 6: Test with simplified data
        print(f"\n🔍 STEP 6: Testing with simplified data (quantity 1)")
        success2, result2 = self.test_simplified_assignment(tool_id, technicien_id)
        
        # Step 7: Test with different quantities
        print(f"\n🔍 STEP 7: Testing with quantity 1 (full data)")
        success3, result3 = self.test_tool_assignment(tool_id, technicien_id, 1)
        
        # Summary
        print("\n" + "=" * 80)
        print("📋 DIAGNOSTIC SUMMARY")
        print("=" * 80)
        
        print(f"Test 1 (Quantity 5, Full Data): {'✅ PASSED' if success1 else '❌ FAILED'}")
        print(f"Test 2 (Quantity 1, Minimal Data): {'✅ PASSED' if success2 else '❌ FAILED'}")
        print(f"Test 3 (Quantity 1, Full Data): {'✅ PASSED' if success3 else '❌ FAILED'}")
        
        if not success1 and not success2 and not success3:
            print("\n❌ ALL TESTS FAILED - There's a systematic issue with tool assignment")
            print("Possible causes:")
            print("1. Missing required fields in request")
            print("2. Validation errors in backend")
            print("3. Permission issues")
            print("4. Database constraints")
        elif success2 or success3:
            print("\n⚠️ PARTIAL SUCCESS - Issue might be with specific data or quantity")
            if not success1:
                print("The quantity 5 specifically causes issues")
        else:
            print("\n✅ ALL TESTS PASSED - Tool assignment is working correctly")
        
        return success1 or success2 or success3

if __name__ == "__main__":
    tester = ToolAssignmentTester()
    tester.run_diagnostic()