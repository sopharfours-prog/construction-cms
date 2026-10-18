-- Staff registration requests: accounts wait in PENDING until an administrator
-- approves them. PENDING accounts cannot sign in.
ALTER TYPE "UserStatus" ADD VALUE 'PENDING';
