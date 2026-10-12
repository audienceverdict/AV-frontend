import {describe,expect,it} from 'vitest';
import type {Movie,Review} from '../types';
import {filterMovies,getMovieStatusCounts,isMovieProfileIncomplete,paginateMovies} from './movieCatalog';

const movie=(id:string,fields:Partial<Movie>={}):Movie=>({id,title:`Film ${id}`,posterUrl:`https://example.com/${id}.jpg`,trailerUrl:'',description:'A synopsis',genre:['Drama'],language:'Telugu',duration:120,releaseDate:'2026-10-10',certification:'UA',director:'Director A',cast:['Actor A'],production:'Studio A',status:'ACTIVE',...fields});
const reviews:Review[]=[{id:'review-1',movieId:'a',author:'Audience',title:'Loved it',text:'Good film',rating:5,videoUrl:'',platform:'YOUTUBE',thumbnail:'',isHighlighted:false,status:'APPROVED',createdAt:'2026-10-10'}];

describe('movie catalog helpers',()=>{
 it('filters using title, cast, director, language, certification, genre, status, and release date',()=>{
  const movies=[movie('a'),movie('b',{title:'Second film',language:'English',genre:['Comedy'],certification:'U',status:'UPCOMING',releaseDate:'2025-02-01',cast:['Actor B']})];
  expect(filterMovies(movies,{search:'actor b',language:'English',genre:'Comedy',certification:'U',status:'UPCOMING',year:'2025'}).map(item=>item.id)).toEqual(['b']);
  expect(filterMovies(movies,{search:'Director A'}).map(item=>item.id)).toEqual(['a','b']);
 });
 it('sorts rating only from approved supported reviews and leaves unrated titles after rated titles',()=>{
  const movies=[movie('b'),movie('a')];
  const result=filterMovies(movies,{sort:'rating'},[...reviews,{...reviews[0],id:'pending',movieId:'b',rating:1,status:'PENDING'}]);
  expect(result.map(item=>item.id)).toEqual(['a','b']);
 });
 it('counts real status totals and flags incomplete movie profiles',()=>{
  const complete=movie('complete');const incomplete=movie('incomplete',{posterUrl:'',cast:[],description:'',status:'UPCOMING'});
  expect(isMovieProfileIncomplete(complete)).toBe(false);expect(isMovieProfileIncomplete(incomplete)).toBe(true);expect(getMovieStatusCounts([complete,incomplete])).toEqual({total:2,upcoming:1,active:1,ended:0,incomplete:1});
 });
 it('paginates safely and clamps pages after filters reduce the result set',()=>{
  const page=paginateMovies([1,2,3],4,2);expect(page).toEqual({items:[3],page:1,pages:2});expect(paginateMovies([],0,12)).toEqual({items:[],page:0,pages:0});
 });
});
