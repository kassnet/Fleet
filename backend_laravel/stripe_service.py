#!/usr/bin/env python3
"""
Service Python pour l'intégration Stripe avec Laravel via emergentintegrations
"""

import os
import json
import asyncio
import sys
from datetime import datetime
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest

class StripePaymentService:
    def __init__(self):
        self.api_key = os.environ.get('STRIPE_API_KEY')
        if not self.api_key:
            raise ValueError("STRIPE_API_KEY not found in environment variables")
        
        # URL de base Laravel
        self.base_url = "http://localhost:8002"
        self.webhook_url = f"{self.base_url}/api/webhook/stripe"
        
        # Initialiser Stripe Checkout
        self.stripe_checkout = StripeCheckout(
            api_key=self.api_key, 
            webhook_url=self.webhook_url
        )

    async def create_checkout_session(self, data):
        """Créer une session de checkout Stripe"""
        try:
            amount = float(data.get('amount', 0))
            currency = data.get('currency', 'usd').lower()
            success_url = data.get('success_url')
            cancel_url = data.get('cancel_url')
            metadata = data.get('metadata', {})

            # Créer la requête de checkout
            checkout_request = CheckoutSessionRequest(
                amount=amount,
                currency=currency,
                success_url=success_url,
                cancel_url=cancel_url,
                metadata=metadata
            )

            # Créer la session
            session: CheckoutSessionResponse = await self.stripe_checkout.create_checkout_session(checkout_request)
            
            return {
                'success': True,
                'session_id': session.session_id,
                'url': session.url,
                'amount': amount,
                'currency': currency
            }

        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

    async def get_checkout_status(self, session_id):
        """Vérifier le statut d'une session de checkout"""
        try:
            status: CheckoutStatusResponse = await self.stripe_checkout.get_checkout_status(session_id)
            
            return {
                'success': True,
                'session_id': session_id,
                'status': status.status,
                'payment_status': status.payment_status,
                'amount_total': status.amount_total,
                'currency': status.currency,
                'metadata': status.metadata
            }

        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

    async def handle_webhook(self, webhook_body, signature):
        """Traiter un webhook Stripe"""
        try:
            webhook_response = await self.stripe_checkout.handle_webhook(
                webhook_body.encode(), 
                signature
            )
            
            return {
                'success': True,
                'event_type': webhook_response.event_type,
                'event_id': webhook_response.event_id,
                'session_id': webhook_response.session_id,
                'payment_status': webhook_response.payment_status,
                'metadata': webhook_response.metadata
            }

        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

async def main():
    """Fonction principale pour traiter les commandes"""
    if len(sys.argv) < 2:
        print(json.dumps({'success': False, 'error': 'No command provided'}))
        return

    command = sys.argv[1]
    service = StripePaymentService()

    if command == 'create_session':
        if len(sys.argv) < 3:
            print(json.dumps({'success': False, 'error': 'No data provided'}))
            return
        
        data = json.loads(sys.argv[2])
        result = await service.create_checkout_session(data)
        print(json.dumps(result))

    elif command == 'check_status':
        if len(sys.argv) < 3:
            print(json.dumps({'success': False, 'error': 'No session_id provided'}))
            return
        
        session_id = sys.argv[2]
        result = await service.get_checkout_status(session_id)
        print(json.dumps(result))

    elif command == 'handle_webhook':
        if len(sys.argv) < 4:
            print(json.dumps({'success': False, 'error': 'No webhook data provided'}))
            return
        
        webhook_body = sys.argv[2]
        signature = sys.argv[3]
        result = await service.handle_webhook(webhook_body, signature)
        print(json.dumps(result))

    else:
        print(json.dumps({'success': False, 'error': f'Unknown command: {command}'}))

if __name__ == "__main__":
    asyncio.run(main())