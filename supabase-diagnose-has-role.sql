-- Diagnose: zeigt die echte Signatur von has_role() und den echten Typ der
-- role-Spalte in user_roles. Bitte im SQL-Editor ausführen und mir das
-- Ergebnis (beide Zeilen/Tabellen) schicken.

select n.nspname as schema, p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as arguments
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where p.proname = 'has_role';

select table_schema, column_name, data_type, udt_schema, udt_name
from information_schema.columns
where table_name = 'user_roles' and column_name = 'role';
