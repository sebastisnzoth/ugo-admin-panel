export type ClientCoordinates={latitude:number;longitude:number}
export type ClientGeocodeResult=ClientCoordinates&{address:string;zone:string}

const valid=(latitude:number,longitude:number)=>Number.isFinite(latitude)&&latitude>=-90&&latitude<=90&&Number.isFinite(longitude)&&longitude>=-180&&longitude<=180&&!(Math.abs(latitude)<0.0001&&Math.abs(longitude)<0.0001)

async function json(url:string,timeout=7000){
 const controller=new AbortController(),timer=window.setTimeout(()=>controller.abort(),timeout)
 try{const response=await fetch(url,{signal:controller.signal,cache:'no-store'});if(!response.ok)throw new Error('geocoder unavailable');return await response.json() as unknown}
 finally{window.clearTimeout(timer)}
}

function photonAddress(properties:Record<string,unknown>){
 const text=(key:string)=>typeof properties[key]==='string'?String(properties[key]).trim():''
 const street=text('street')||text('name'),number=text('housenumber'),district=text('district')||text('locality')||text('suburb'),city=text('city')||text('town')||text('village')
 const address=[(street+(number?' '+number:'')).trim(),district,city].filter(Boolean).join(', ')
 return{address,zone:district||city}
}

export function validClientCoordinates(latitude:number,longitude:number){return valid(latitude,longitude)}

export async function reverseClientCoordinates(latitude:number,longitude:number):Promise<ClientGeocodeResult|null>{
 if(!valid(latitude,longitude))return null
 try{
  const raw=await json('https://photon.komoot.io/reverse?lat='+encodeURIComponent(latitude)+'&lon='+encodeURIComponent(longitude)) as{features?:Array<{properties?:Record<string,unknown>}>}
  const parsed=photonAddress(raw.features?.[0]?.properties||{})
  if(parsed.address)return{latitude,longitude,...parsed}
 }catch{}
 try{
  const raw=await json('https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&lat='+encodeURIComponent(latitude)+'&lon='+encodeURIComponent(longitude)) as{display_name?:unknown;address?:Record<string,unknown>}
  const p=raw.address||{},text=(key:string)=>typeof p[key]==='string'?String(p[key]).trim():''
  const street=text('road')||text('pedestrian')||text('footway')||text('neighbourhood'),number=text('house_number'),district=text('suburb')||text('neighbourhood')||text('city_district'),city=text('city')||text('town')||text('village')||text('municipality')
  const address=[(street+(number?' '+number:'')).trim(),district,city].filter(Boolean).join(', ')||(typeof raw.display_name==='string'?raw.display_name.trim():'')
  if(address)return{latitude,longitude,address,zone:district||city}
 }catch{}
 return null
}

export async function geocodeClientAddress(address:string,zone=''):Promise<ClientGeocodeResult|null>{
 const query=[address.trim(),zone.trim()].filter(Boolean).join(', ')
 if(query.length<5)return null
 try{
  const raw=await json('https://photon.komoot.io/api/?limit=1&q='+encodeURIComponent(query)) as{features?:Array<{geometry?:{coordinates?:unknown};properties?:Record<string,unknown>}>}
  const feature=raw.features?.[0],coords=feature?.geometry?.coordinates
  if(Array.isArray(coords)&&coords.length>=2){
   const longitude=Number(coords[0]),latitude=Number(coords[1])
   if(valid(latitude,longitude)){const parsed=photonAddress(feature?.properties||{});return{latitude,longitude,address:parsed.address||address.trim(),zone:parsed.zone||zone.trim()}}
  }
 }catch{}
 try{
  const raw=await json('https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=1&q='+encodeURIComponent(query)) as Array<{lat?:unknown;lon?:unknown;display_name?:unknown;address?:Record<string,unknown>}>
  const first=raw?.[0],latitude=Number(first?.lat),longitude=Number(first?.lon)
  if(valid(latitude,longitude)){
   const p=first?.address||{},pick=(key:string)=>typeof p[key]==='string'?String(p[key]).trim():'',district=pick('suburb')||pick('neighbourhood')||pick('city_district'),city=pick('city')||pick('town')||pick('village')||pick('municipality')
   return{latitude,longitude,address:typeof first?.display_name==='string'&&first.display_name.trim()?first.display_name.trim():address.trim(),zone:district||city||zone.trim()}
  }
 }catch{}
 return null
}
