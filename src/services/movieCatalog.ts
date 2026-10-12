import type {Movie,Review} from '../types';

export interface MovieFilters {
 search?:string;
 language?:string;
 genre?:string;
 certification?:string;
 status?:string;
 year?:string;
 sort?:'featured'|'title'|'release'|'rating';
}

export function filterMovies(movies:Movie[],filters:MovieFilters={},reviews:Review[]=[]):Movie[]{
 const query=(filters.search||'').trim().toLocaleLowerCase();
 const filtered=movies.filter(movie=>{
  const matchesQuery=!query||[movie.title,movie.director,movie.production,...(movie.genre||[]),...(movie.cast||[])].some(value=>String(value||'').toLocaleLowerCase().includes(query));
  return matchesQuery&&(!filters.language||movie.language===filters.language)&&(!filters.genre||(movie.genre||[]).includes(filters.genre))&&(!filters.certification||movie.certification===filters.certification)&&(!filters.status||movie.status===filters.status)&&(!filters.year||movie.releaseDate?.slice(0,4)===filters.year);
 });
 if(filters.sort==='title')return filtered.sort((a,b)=>a.title.localeCompare(b.title));
 if(filters.sort==='release')return filtered.sort((a,b)=>(b.releaseDate||'').localeCompare(a.releaseDate||''));
 if(filters.sort==='rating'){
  const scores=new Map<string,{total:number;count:number}>();
  for(const review of reviews){if(review.status!=='APPROVED'||review.platform==='OTHER'||review.rating<=0)continue;const current=scores.get(review.movieId)||{total:0,count:0};current.total+=review.rating;current.count++;scores.set(review.movieId,current);}
  return filtered.sort((a,b)=>{const left=scores.get(a.id),right=scores.get(b.id);const l=left?left.total/left.count:-1,r=right?right.total/right.count:-1;return r-l;});
 }
 return filtered;
}

export function isMovieProfileIncomplete(movie:Movie):boolean{
 return !String(movie.title||'').trim()||!String(movie.posterUrl||'').trim()||!String(movie.language||'').trim()||!Number.isFinite(movie.duration)||movie.duration<=0||!String(movie.releaseDate||'').trim()||!String(movie.certification||'').trim()||!String(movie.director||'').trim()||!String(movie.production||'').trim()||!(movie.genre||[]).some(value=>String(value).trim())||!(movie.cast||[]).some(value=>String(value).trim())||!String(movie.description||'').trim();
}

export function getMovieStatusCounts(movies:Movie[]){
 return {total:movies.length,upcoming:movies.filter(movie=>movie.status==='UPCOMING').length,active:movies.filter(movie=>movie.status==='ACTIVE').length,ended:movies.filter(movie=>movie.status==='ENDED').length,incomplete:movies.filter(isMovieProfileIncomplete).length};
}

export function paginateMovies<T>(items:T[],page:number,pageSize:number){
 const safePage=Math.max(0,Math.min(page,Math.max(0,Math.ceil(items.length/pageSize)-1)));
 return {items:items.slice(safePage*pageSize,(safePage+1)*pageSize),page:safePage,pages:Math.ceil(items.length/pageSize)};
}
