UPDATE pet_shop_configs SET max_concurrent_appointments = 1 WHERE max_concurrent_appointments < 1;

ALTER TABLE pet_shop_configs ADD CONSTRAINT check_max_concurrent_positive CHECK (max_concurrent_appointments >= 1);