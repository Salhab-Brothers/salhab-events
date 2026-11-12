#!/usr/bin/env python3
"""Turn old-system CSV exports into an SQL file for the Supabase SQL Editor.

Usage: python3 -I scripts/csv-to-sql.py <folder with the *_export.csv files> [--replace]

Writes <folder>/data-export/import.sql (gitignored; it contains personal data).
Without --replace the SQL refuses to run if bookings or requests already have rows.
--replace first deletes all bookings and booking requests. Only use it BEFORE
cutover: afterwards the new database is the source of truth and this would erase
real data.
"""
import csv, os, sys

root = sys.argv[1]
replace = '--replace' in sys.argv[2:]
q = lambda s: "'" + (s or '').replace("'", "''") + "'"
b = lambda s: 'true' if (s or '').strip().lower() == 'true' else 'false'
slot = lambda s: 'lunch' if s == 'morning' else s  # legacy slot, same label in the app
phone = lambda s: (s or '').lstrip("'")  # the old export prefixed some phones with a stray apostrophe
ts = lambda s: q(s) + '::timestamptz' if s else 'now()'
rd = lambda f: list(csv.DictReader(open(os.path.join(root, f), encoding='utf-8-sig')))

if replace:
    guard = "delete from public.bookings;\ndelete from public.booking_requests;"
else:
    guard = ("do $$ begin if exists (select 1 from public.bookings) or exists (select 1 from public.booking_requests) "
             "then raise exception 'tables not empty, import already ran'; end if; end $$;")
out = ["begin;", guard]
for r in rd('Booking_export.csv'):
    out.append("insert into public.bookings (date,event_name,time_slot,person_name,phone,notes,status,book_diwan,created_date) values (%s,%s,%s,%s,%s,%s,%s,%s,%s);" % (
        q(r['date']), q(r['event_name']), q(slot(r['time_slot'])), q(r['person_name']), q(phone(r['phone'])), q(r['notes']), q(r['status'] or 'confirmed'), b(r['book_diwan']), ts(r['created_date'])))
for r in rd('BookingRequest_export.csv'):
    out.append("insert into public.booking_requests (first_name,second_name,third_name,last_name,phone,date,time_slot,event_name,book_diwan,status,submitted_at,created_date) values (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s);" % (
        q(r['first_name']), q(r['second_name']), q(r['third_name']), q(r['last_name']), q(phone(r['phone'])), q(r['date']), q(slot(r['time_slot'])), q(r['event_name']), b(r['book_diwan']), q(r['status'] or 'pending'), ts(r['submitted_at']), ts(r['created_date'])))
out.append("commit;")
os.makedirs(os.path.join(root, 'data-export'), exist_ok=True)
open(os.path.join(root, 'data-export', 'import.sql'), 'w', encoding='utf-8').write("\n".join(out) + "\n")
print(len(out) - 3, 'inserts written')
