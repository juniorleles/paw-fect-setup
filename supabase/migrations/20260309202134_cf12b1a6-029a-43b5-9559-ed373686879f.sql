-- Temporarily allow service role to update
CREATE POLICY "Service role can update configs" ON pet_shop_configs FOR UPDATE USING (true) WITH CHECK (true);

UPDATE pet_shop_configs 
SET meta_waba_id = '905575625723511', 
    meta_phone_number_id = '1059775900543726'
WHERE user_id = '3de71a0a-e878-4b12-a05e-4851212f8bca';

-- Remove temporary policy
DROP POLICY "Service role can update configs" ON pet_shop_configs;