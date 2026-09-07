-- ParFolio v220: rights-aware official course imagery with satellite fallback.
alter table public.course_catalog
  add column if not exists image_url text,
  add column if not exists image_source_url text,
  add column if not exists image_license text,
  add column if not exists image_attribution text,
  add column if not exists image_status text not null default 'satellite_fallback',
  add column if not exists image_reviewed_at timestamptz;

alter table public.course_catalog
  drop constraint if exists course_catalog_image_status_check,
  add constraint course_catalog_image_status_check
    check (image_status in ('satellite_fallback','needs_review','official_approved','rejected'));

alter table public.course_catalog
  drop constraint if exists course_catalog_approved_image_metadata_check,
  add constraint course_catalog_approved_image_metadata_check
    check (
      image_status <> 'official_approved'
      or (
        nullif(btrim(image_url),'') is not null
        and nullif(btrim(image_source_url),'') is not null
        and nullif(btrim(image_license),'') is not null
        and nullif(btrim(image_attribution),'') is not null
        and image_reviewed_at is not null
      )
    );

comment on column public.course_catalog.image_status is
  'Only official_approved may render a photo; all other values use a satellite preview.';
comment on column public.course_catalog.image_source_url is
  'Public page documenting the official source and permitted reuse of the course photo.';

create or replace function public.parfolio_course_catalog_page(
  p_state_code text default null::text,
  p_offset integer default 0,
  p_limit integer default 500
)
returns jsonb
language sql
stable
set search_path to 'public'
as $function$
  select coalesce(jsonb_agg(jsonb_build_object(
    'catalog_id',c.id,'source_id',c.source_id,'name',c.name,'city',c.city,'state_code',c.state_code,
    'postal_code',c.postal_code,'country_code',c.country_code,'address',c.address,'lat',c.latitude,'lng',c.longitude,
    'holes',c.holes,'par',c.par,'course_type',c.course_type,'phone',c.phone,'website',c.website,
    'mapping_class',c.mapping_class,'mapped_holes',(select count(*) from public.course_hole_geometry h where h.course_id=c.id),
    'osm_course_uri',c.osm_course_uri,'source_license',c.source_license,'source_attribution',c.source_attribution,
    'image_url',c.image_url,'image_source_url',c.image_source_url,'image_license',c.image_license,
    'image_attribution',c.image_attribution,'image_status',c.image_status,'image_reviewed_at',c.image_reviewed_at
  ) order by c.name,c.id),'[]'::jsonb)
  from (
    select * from public.course_catalog
    where is_active and rejection_reason is null and (p_state_code is null or upper(state_code)=upper(p_state_code))
    order by name,id offset greatest(coalesce(p_offset,0),0) limit least(greatest(coalesce(p_limit,500),1),500)
  ) c;
$function$;

-- The only active catalog row without a location. The official course site
-- confirms the clubhouse address; the point centers its satellite fallback.
update public.course_catalog
set city='Truckee',
    postal_code='96161',
    address='12850 Northwoods Blvd., Truckee, CA 96161',
    latitude=39.352177,
    longitude=-120.233368,
    holes=coalesce(holes,18),
    par=coalesce(par,72),
    website='https://www.tahoedonner.com/amenities/amenities/golf/',
    updated_at=now()
where id='9fcca8de-b3ff-40a2-b02c-d72cf39f5d2b';
