-- Official source verified 2026-09-07: https://www.sierralakes.com/contact-us/
update public.course_catalog set postal_code='92336',address=coalesce(address,'16600 Clubhouse Drive, Fontana, CA 92336') where name='Sierra Lakes Golf Club' and city='Fontana' and state_code='CA' and postal_code is null;
