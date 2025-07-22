import requests
import json
from datetime import datetime

class ComprehensiveToolTest:
    def __init__(self, base_url="https://8e37cb3e-3e18-40ed-83ff-145bb27f2c21.preview.emergentagent.com"):
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
                return True
            else:
                print(f"❌ Authentication failed: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            print(f"❌ Authentication error: {str(e)}")
            return False

    def test_tat100_assignment(self):
        """Test the specific TAT100 assignment issue"""
        print("=" * 80)
        print("🔍 TESTING TAT100 TOOL ASSIGNMENT - SPECIFIC ISSUE")
        print("=" * 80)
        
        if not self.authenticate():
            return False
        
        # Get tools and find TAT100
        print("\n🔧 Looking for TAT100 tool...")
        try:
            response = requests.get(f"{self.base_url}/api/outils", headers=self.headers)
            if response.status_code == 200:
                tools = response.json()
                tat100_tool = None
                
                # Look for TAT100 by name or reference
                for tool in tools:
                    if (tool.get('nom') == 'TAT100' or 
                        tool.get('reference') == 'TAT100' or
                        'TAT100' in str(tool.get('nom', '')) or
                        'TAT100' in str(tool.get('reference', ''))):
                        tat100_tool = tool
                        break
                
                if tat100_tool:
                    print(f"✅ Found TAT100 tool:")
                    print(f"   Name: {tat100_tool.get('nom')}")
                    print(f"   Reference: {tat100_tool.get('reference')}")
                    print(f"   ID: {tat100_tool.get('id')}")
                    print(f"   Stock: {tat100_tool.get('quantite_stock')}")
                    print(f"   Available: {tat100_tool.get('quantite_disponible')}")
                else:
                    print("❌ TAT100 tool not found")
                    print("Available tools:")
                    for tool in tools:
                        print(f"   - {tool.get('nom')} (Ref: {tool.get('reference')})")
                    return False
            else:
                print(f"❌ Failed to get tools: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Error getting tools: {str(e)}")
            return False
        
        # Get users and find Israël Kanda
        print("\n👥 Looking for Israël Kanda...")
        try:
            response = requests.get(f"{self.base_url}/api/users", headers=self.headers)
            if response.status_code == 200:
                users = response.json()
                israel_user = None
                
                # Look for Israël Kanda
                for user in users:
                    full_name = f"{user.get('nom', '')} {user.get('prenom', '')}".strip().lower()
                    if ('israël' in full_name and 'kanda' in full_name) or \
                       ('israel' in full_name and 'kanda' in full_name):
                        israel_user = user
                        break
                
                if israel_user:
                    print(f"✅ Found Israël Kanda:")
                    print(f"   Name: {israel_user.get('nom')} {israel_user.get('prenom')}")
                    print(f"   Email: {israel_user.get('email')}")
                    print(f"   ID: {israel_user.get('id')}")
                    print(f"   Role: {israel_user.get('role')}")
                else:
                    print("❌ Israël Kanda not found")
                    print("Available users:")
                    for user in users:
                        full_name = f"{user.get('nom', '')} {user.get('prenom', '')}".strip()
                        print(f"   - {full_name} ({user.get('email')}) - Role: {user.get('role')}")
                    return False
            else:
                print(f"❌ Failed to get users: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Error getting users: {str(e)}")
            return False
        
        # Test the exact assignment that was failing
        print(f"\n🔧 Testing TAT100 assignment to Israël Kanda with quantity 5...")
        
        # Test different payload formats to identify the issue
        test_cases = [
            {
                "name": "Complete payload (as expected by frontend)",
                "data": {
                    "outil_id": tat100_tool.get('id'),
                    "technicien_id": israel_user.get('id'),
                    "quantite_affectee": 5,
                    "notes_affectation": "Assignment from modal"
                }
            },
            {
                "name": "Minimal payload",
                "data": {
                    "technicien_id": israel_user.get('id'),
                    "quantite_affectee": 5
                }
            },
            {
                "name": "With date_retour_prevue",
                "data": {
                    "outil_id": tat100_tool.get('id'),
                    "technicien_id": israel_user.get('id'),
                    "quantite_affectee": 5,
                    "date_retour_prevue": "2025-08-21T12:00:00",
                    "notes_affectation": "Assignment with return date"
                }
            }
        ]
        
        for i, test_case in enumerate(test_cases, 1):
            print(f"\n🧪 Test Case {i}: {test_case['name']}")
            print(f"Payload: {json.dumps(test_case['data'], indent=2)}")
            
            try:
                response = requests.post(
                    f"{self.base_url}/api/outils/{tat100_tool.get('id')}/affecter",
                    json=test_case['data'],
                    headers=self.headers
                )
                
                print(f"📊 Status Code: {response.status_code}")
                
                if response.status_code == 200:
                    result = response.json()
                    print(f"✅ SUCCESS!")
                    print(f"Assignment ID: {result.get('id')}")
                    print(f"Status: {result.get('statut')}")
                    break
                elif response.status_code == 422:
                    try:
                        error_detail = response.json()
                        print(f"❌ VALIDATION ERROR (422):")
                        print(f"Details: {json.dumps(error_detail, indent=2)}")
                    except:
                        print(f"❌ VALIDATION ERROR (422): {response.text}")
                else:
                    print(f"❌ ERROR {response.status_code}: {response.text}")
                    
            except Exception as e:
                print(f"❌ Exception: {str(e)}")
        
        return True

    def test_assignment_validation(self):
        """Test various validation scenarios"""
        print("\n" + "=" * 80)
        print("🧪 TESTING ASSIGNMENT VALIDATION SCENARIOS")
        print("=" * 80)
        
        if not self.authenticate():
            return False
        
        # Get a tool and user for testing
        tools_response = requests.get(f"{self.base_url}/api/outils", headers=self.headers)
        users_response = requests.get(f"{self.base_url}/api/users", headers=self.headers)
        
        if tools_response.status_code != 200 or users_response.status_code != 200:
            print("❌ Failed to get test data")
            return False
        
        tools = tools_response.json()
        users = users_response.json()
        
        if not tools or not users:
            print("❌ No tools or users available")
            return False
        
        test_tool = tools[0]
        test_user = next((u for u in users if u.get('role') == 'technicien'), users[0])
        
        print(f"Using tool: {test_tool.get('nom')} (ID: {test_tool.get('id')})")
        print(f"Using user: {test_user.get('nom')} {test_user.get('prenom')} (ID: {test_user.get('id')})")
        
        # Test validation scenarios
        validation_tests = [
            {
                "name": "Missing outil_id in payload",
                "data": {
                    "technicien_id": test_user.get('id'),
                    "quantite_affectee": 1
                },
                "expected_status": 422
            },
            {
                "name": "Missing technicien_id",
                "data": {
                    "outil_id": test_tool.get('id'),
                    "quantite_affectee": 1
                },
                "expected_status": 422
            },
            {
                "name": "Missing quantite_affectee",
                "data": {
                    "outil_id": test_tool.get('id'),
                    "technicien_id": test_user.get('id')
                },
                "expected_status": 422
            },
            {
                "name": "Invalid tool ID",
                "data": {
                    "outil_id": "invalid_id",
                    "technicien_id": test_user.get('id'),
                    "quantite_affectee": 1
                },
                "expected_status": [400, 404, 422]
            },
            {
                "name": "Invalid user ID",
                "data": {
                    "outil_id": test_tool.get('id'),
                    "technicien_id": "invalid_id",
                    "quantite_affectee": 1
                },
                "expected_status": [400, 404, 422]
            },
            {
                "name": "Zero quantity",
                "data": {
                    "outil_id": test_tool.get('id'),
                    "technicien_id": test_user.get('id'),
                    "quantite_affectee": 0
                },
                "expected_status": [400, 422]
            },
            {
                "name": "Negative quantity",
                "data": {
                    "outil_id": test_tool.get('id'),
                    "technicien_id": test_user.get('id'),
                    "quantite_affectee": -1
                },
                "expected_status": [400, 422]
            }
        ]
        
        for test in validation_tests:
            print(f"\n🧪 Testing: {test['name']}")
            
            try:
                response = requests.post(
                    f"{self.base_url}/api/outils/{test_tool.get('id')}/affecter",
                    json=test['data'],
                    headers=self.headers
                )
                
                expected_statuses = test['expected_status'] if isinstance(test['expected_status'], list) else [test['expected_status']]
                
                if response.status_code in expected_statuses:
                    print(f"✅ Expected status {response.status_code}")
                    if response.status_code == 422:
                        try:
                            error_detail = response.json()
                            print(f"   Validation error: {error_detail.get('detail', [{}])[0].get('msg', 'Unknown')}")
                        except:
                            pass
                else:
                    print(f"❌ Unexpected status {response.status_code} (expected {expected_statuses})")
                    print(f"   Response: {response.text}")
                    
            except Exception as e:
                print(f"❌ Exception: {str(e)}")
        
        return True

if __name__ == "__main__":
    tester = ComprehensiveToolTest()
    tester.test_tat100_assignment()
    tester.test_assignment_validation()