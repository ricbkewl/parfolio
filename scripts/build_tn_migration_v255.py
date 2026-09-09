"""Generate the reviewed Tennessee v255 Supabase data migration."""

import json
import pathlib


ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data/tn-osm-gps-v255.json"
TARGET = ROOT / "supabase/migrations/20260909202253_parfolio_tennessee_catalog_v255.sql"


def main():
    payload = json.loads(SOURCE.read_text(encoding="utf-8"))
    compact = json.dumps(payload, separators=(",", ":")).replace("$tn$", "$ tn $")
    sql = f"""-- ParFolio v255: audited Tennessee catalog and validated OSM geometry.
-- OpenGolfAPI and OpenStreetMap database content is ODbL 1.0.
do $migration$
declare
  payload jsonb := $tn${compact}$tn$::jsonb;
  course_entry record;
  hole_entry jsonb;
  course jsonb;
  catalog_id uuid;
  preserve_verified boolean;
  mapping text;
  declared_holes smallint;
begin
  for course_entry in select * from jsonb_each(payload->'courses') loop
    course := course_entry.value;
    mapping := course->>'mappingClass';
    declared_holes := case
      when (course->>'declaredHoles')::integer in (9,18) then (course->>'declaredHoles')::smallint
      when (course->>'sourceHoles')::double precision::integer in (9,18) then (course->>'sourceHoles')::double precision::smallint
      else null
    end;

    select exists(
      select 1
      from public.course_catalog existing
      where existing.source_id=course->>'sourceId'
        and existing.mapping_class='gps_ready'
        and existing.holes in (9,18)
        and (select count(*) from public.course_hole_geometry geometry
             where geometry.course_id=existing.id
               and geometry.validation_state='validated'
               and geometry.tee_lat between -90 and 90 and geometry.tee_lng between -180 and 180
               and geometry.green_center_lat between -90 and 90 and geometry.green_center_lng between -180 and 180
               and not (geometry.tee_lat=0 and geometry.tee_lng=0)
               and not (geometry.green_center_lat=0 and geometry.green_center_lng=0))=existing.holes
    ) into preserve_verified;

    insert into public.course_catalog(
      source_id,source_name,normalized_name,name,city,state_code,postal_code,country_code,address,
      latitude,longitude,holes,par,course_type,phone,website,osm_course_uri,mapping_class,
      source_license,source_attribution,is_active,rejection_reason,imported_at,updated_at
    ) values (
      course->>'sourceId',course->>'sourceName',
      trim(regexp_replace(lower(course->>'name'),'[^a-z0-9]+',' ','g')),
      course->>'name',nullif(course->>'city',''),'TN',nullif(course->>'postalCode',''),'US',nullif(course->>'address',''),
      (course->>'latitude')::double precision,(course->>'longitude')::double precision,
      declared_holes,(course->>'sourcePar')::double precision::smallint,nullif(course->>'courseType',''),nullif(course->>'phone',''),nullif(course->>'website',''),
      nullif(course->>'osmCourseUri',''),case when preserve_verified then 'gps_ready' else mapping end,
      'ODbL-1.0',
      case when course->>'sourceName'='openstreetmap'
        then 'Contains data from OpenStreetMap contributors, ODbL 1.0'
        else 'Contains data from OpenGolfAPI (opengolfapi.org) and OpenStreetMap contributors, ODbL 1.0' end,
      true,null,now(),now()
    )
    on conflict(source_id) do update set
      source_name=excluded.source_name,
      normalized_name=excluded.normalized_name,
      name=excluded.name,
      city=coalesce(excluded.city,public.course_catalog.city),
      state_code='TN',
      postal_code=coalesce(excluded.postal_code,public.course_catalog.postal_code),
      country_code='US',
      address=coalesce(excluded.address,public.course_catalog.address),
      latitude=excluded.latitude,
      longitude=excluded.longitude,
      holes=case when preserve_verified then public.course_catalog.holes else excluded.holes end,
      par=coalesce(excluded.par,public.course_catalog.par),
      course_type=coalesce(excluded.course_type,public.course_catalog.course_type),
      phone=coalesce(excluded.phone,public.course_catalog.phone),
      website=coalesce(excluded.website,public.course_catalog.website),
      osm_course_uri=coalesce(excluded.osm_course_uri,public.course_catalog.osm_course_uri),
      mapping_class=case when preserve_verified then public.course_catalog.mapping_class else excluded.mapping_class end,
      source_license=excluded.source_license,
      source_attribution=excluded.source_attribution,
      is_active=true,
      rejection_reason=null,
      updated_at=now()
    returning id into catalog_id;

    if not preserve_verified then
      delete from public.course_hole_geometry where course_id=catalog_id;
      for hole_entry in select value from jsonb_array_elements(course->'greens') loop
        insert into public.course_hole_geometry(
          course_id,hole_number,par,tee_lat,tee_lng,aim1_lat,aim1_lng,aim2_lat,aim2_lng,
          green_front_lat,green_front_lng,green_center_lat,green_center_lng,green_back_lat,green_back_lng,
          route_geojson,osm_hole_uri,source,validation_state,created_at,updated_at
        ) values (
          catalog_id,(hole_entry->>'hole')::smallint,(hole_entry->>'par')::smallint,
          (hole_entry->'tee'->>'lat')::double precision,(hole_entry->'tee'->>'lng')::double precision,
          (hole_entry->'aim1'->>'lat')::double precision,(hole_entry->'aim1'->>'lng')::double precision,
          (hole_entry->'aim2'->>'lat')::double precision,(hole_entry->'aim2'->>'lng')::double precision,
          (hole_entry->'front'->>'lat')::double precision,(hole_entry->'front'->>'lng')::double precision,
          (hole_entry->'center'->>'lat')::double precision,(hole_entry->'center'->>'lng')::double precision,
          (hole_entry->'back'->>'lat')::double precision,(hole_entry->'back'->>'lng')::double precision,
          hole_entry->'route',nullif(hole_entry->>'osmHoleUri',''),'OpenStreetMap via Overpass',
          case mapping when 'gps_ready' then 'validated' when 'quarantined' then 'quarantined' else 'partial' end,
          now(),now()
        );
      end loop;
    end if;
  end loop;

  -- A status label never outranks the actual stored payload.
  update public.course_catalog catalog
  set mapping_class='partial_gps',updated_at=now()
  where catalog.state_code='TN' and catalog.mapping_class='gps_ready'
    and (
      catalog.holes not in (9,18)
      or (select count(*) from public.course_hole_geometry geometry
          where geometry.course_id=catalog.id and geometry.validation_state='validated')<>catalog.holes
      or exists(
        select 1 from generate_series(1,catalog.holes) expected(hole_number)
        where not exists(select 1 from public.course_hole_geometry geometry where geometry.course_id=catalog.id and geometry.hole_number=expected.hole_number)
      )
    );
end
$migration$;
"""
    TARGET.write_text(sql, encoding="utf-8")
    print(f"Wrote {TARGET.relative_to(ROOT)} ({len(sql):,} bytes)")


if __name__ == "__main__":
    main()
