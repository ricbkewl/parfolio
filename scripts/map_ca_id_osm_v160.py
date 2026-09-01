import json, math, pathlib, time, datetime
from collections import defaultdict
from scripts import map_ny_osm_v2 as base

OUT=pathlib.Path('data/ca-id-osm-gps-v160.json')
REPORT=pathlib.Path('CA-ID-GPS-MAPPING-REPORT.md')
REGIONS={
 'CA': {'bbox':(32.40,-124.55,42.10,-114.00),'step':1.45},
 'ID': {'bbox':(-11.50,94.50,6.60,141.50),'step':3.00},
}

def download_region(code,cfg):
    s,w,n,e=cfg['bbox']; step=cfg['step']; lat=s; tile=0; dedup={}
    while lat<n:
        nn=min(n,lat+step); lon=w
        while lon<e:
            ee=min(e,lon+step); tile+=1
            els=base.fetch_tile(lat,lon,nn,ee,tile)
            for el in els: dedup[(el.get('type'),el.get('id'))]=el
            print(code,'tile',tile,'objects',len(els),'unique',len(dedup))
            time.sleep(.25); lon=ee
        lat=nn
    return list(dedup.values()),tile

def featureize(elements):
    boundaries=[]; features=[]
    for el in elements:
        pts=base.element_points(el); c=base.centroid(pts); tags=el.get('tags') or {}
        if not pts or not c: continue
        item={'id':el.get('id'),'type':el.get('type'),'tags':tags,'points':pts,'center':c,'bbox':base.bbox(pts)}
        if tags.get('leisure')=='golf_course': boundaries.append(item)
        elif tags.get('golf') in ('hole','tee','green','pin'): features.append(item)
    return boundaries,features

def rows_for(boundary,features):
    bb=boundary['bbox']; poly=boundary['points']; closed=len(poly)>=4 and base.dist_m(poly[0],poly[-1])<25
    selected=[]
    for f in features:
        if not base.in_bbox(f['center'],bb,150): continue
        if closed and not base.point_in_poly(f['center'],poly) and base.dist_m(f['center'],boundary['center'])>1800: continue
        selected.append(f)
    hs=[f for f in selected if f['tags'].get('golf')=='hole']; ts=[f for f in selected if f['tags'].get('golf')=='tee']; gs=[f for f in selected if f['tags'].get('golf')=='green']; ps=[f for f in selected if f['tags'].get('golf')=='pin']
    numbered=defaultdict(list)
    for h in hs:
        num=base.hole_num(h['tags'])
        if num and num<=18: numbered[num].append(h)
    rows=[]; issues=[]
    for num in sorted(numbered):
        h=sorted(numbered[num],key=lambda x:base.route_length(x['points']),reverse=True)[0]; route=h['points'][:]
        if len(route)<2: continue
        s,e=route[0],route[-1]
        tee_s,tee_e=base.nearest(ts,s,180),base.nearest(ts,e,180)
        green_s=base.nearest(ps,s,150) or base.nearest(gs,s,190); green_e=base.nearest(ps,e,150) or base.nearest(gs,e,190)
        forward=(base.dist_m(tee_s['center'],s) if tee_s else 120)+(base.dist_m(green_e['center'],e) if green_e else 120)
        reverse=(base.dist_m(tee_e['center'],e) if tee_e else 120)+(base.dist_m(green_s['center'],s) if green_s else 120)
        if reverse+35<forward: route.reverse(); s,e=route[0],route[-1]
        tee_f=base.nearest(ts,s,180); green_f=base.nearest(gs,e,200); pin_f=base.nearest(ps,e,150)
        tee=(tee_f or {'center':s})['center']; center=(pin_f or green_f or {'center':e})['center']; yards=base.dist_m(tee,center)*1.0936133
        if yards<45 or yards>850: issues.append(f'hole {num} implausible distance {yards:.0f} yd'); continue
        front=back=None
        if green_f: front,back=base.green_edges(tee,center,green_f['points'])
        par=None
        try:
            p=int(float(h['tags'].get('par'))); par=p if 3<=p<=6 else None
        except: pass
        aim1=aim2=None
        if len(route)>2 and par!=3:
            aim1=base.point_fraction(route,.34 if par==5 else .5)
            if par==5: aim2=base.point_fraction(route,.68)
        rows.append({'hole':num,'tee':tee,'center':center,'front':front,'back':back,'aim1':aim1,'aim2':aim2,'par':par,'yards':round(yards)})
    nums=sorted(r['hole'] for r in rows); complete18=all(i in nums for i in range(1,19)); complete9=all(i in nums for i in range(1,10)); playable=18 if complete18 else (9 if complete9 else None)
    return rows,issues,playable

def run():
    all_courses=[]; stats={}
    for code,cfg in REGIONS.items():
        elements,tiles=download_region(code,cfg); boundaries,features=featureize(elements); region=[]; complete=partial=holes=0
        for b in boundaries:
            name=(b['tags'].get('name') or '').strip()
            if not name: continue
            rows,issues,playable=rows_for(b,features)
            if not rows: continue
            holes+=len(rows)
            if playable: complete+=1
            else: partial+=1
            region.append({'region':code,'osmType':b['type'],'osmId':b['id'],'name':name,'center':b['center'],'mappingStatus':'published' if playable else 'partial','playableHoles':playable,'mappedHoleCount':len(rows),'numberedHoles':[r['hole'] for r in rows],'issues':issues[:8],'greens':rows})
        all_courses+=region; stats[code]={'tiles':tiles,'boundaries':len(boundaries),'features':len(features),'mappedCourses':len(region),'publishedComplete':complete,'partial':partial,'mappedHoles':holes}
    generated=datetime.datetime.now(datetime.timezone.utc).isoformat(); out={'version':160,'generatedAt':generated,'source':'OpenStreetMap tiled Overpass','license':'ODbL 1.0','policy':'complete 9/18 maps auto-published; users suggest corrections','stats':stats,'courses':all_courses}
    OUT.parent.mkdir(exist_ok=True); OUT.write_text(json.dumps(out,separators=(',',':')),encoding='utf-8')
    lines=['# California + Indonesia Automated GPS Mapping','',f'Generated: {generated}','','Policy: complete 9/18-hole automated mappings are **Published** immediately. Users report errors through Suggest a Course Correction.','']
    for code in ('CA','ID'):
        s=stats[code]; lines += [f'## {code}',f'- OSM course boundaries: **{s["boundaries"]}**',f'- Courses with mapped hole geometry: **{s["mappedCourses"]}**',f'- Complete auto-published maps: **{s["publishedComplete"]}**',f'- Partial maps not yet playable: **{s["partial"]}**',f'- Hole mappings generated: **{s["mappedHoles"]}**','']
    REPORT.write_text('\n'.join(lines),encoding='utf-8'); print('\n'.join(lines))

if __name__=='__main__': run()
