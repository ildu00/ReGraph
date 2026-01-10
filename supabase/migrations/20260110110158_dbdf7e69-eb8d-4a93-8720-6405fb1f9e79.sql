-- Allow users to update their own deposit addresses (for key_exported tracking)
CREATE POLICY "Users can update their own deposit addresses" 
ON public.wallet_deposit_addresses 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);