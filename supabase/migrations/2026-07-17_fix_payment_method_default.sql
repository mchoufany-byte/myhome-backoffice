-- The clients.payment_method_type column was added directly via the Supabase
-- dashboard (not through a tracked migration) with a default of 'bank_transfer'.
-- That meant every new client row silently got "Bank Transfer" the moment it
-- was created -- in both the backoffice client profile and the mobile app's
-- Payment Method screen -- even though nobody, staff or client, ever chose it.
--
-- This removes the default so new clients start with payment_method_type = null
-- ("Not set") until the client actually picks one in the My Home app.
alter table clients alter column payment_method_type drop default;

-- Note: this does NOT touch existing rows. Any client currently showing
-- "Bank Transfer" that was auto-defaulted (never actually chosen) is
-- indistinguishable at the data level from one who genuinely picked Bank
-- Transfer -- both just have payment_method_type = 'bank_transfer'. There's no
-- way to tell them apart retroactively without asking. If you want to be sure,
-- the safest move is to treat any client who has never opened the My Home app
-- (no auth_id, or no login history) as unconfirmed and follow up with them
-- directly -- new clients going forward will correctly show "Not set" until
-- they choose.
