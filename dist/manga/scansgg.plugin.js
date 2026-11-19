try {
// Auto-generated Harbor Manga Source Plugin from Paperback 0.9
// Source: Scans.GG (v1.0.0-alpha.29)
// Upstream: inkdex/extensions (0.9/stable)

(() => {
  "use strict";

  // 1. In-memory state & interceptors for Paperback Application Bridge
  const __stateStore = new Map();
  const __interceptors = new Set();

  // Remember full series/chapter objects so later calls can pass them back, as the Paperback host does
  const __mangaCache = new Map();
  const __chapterCache = new Map();

  function __absUrl(url) {
    if (!url) return undefined;
    url = String(url).trim();
    if (!url) return undefined;
    if (/^https?:\/\//i.test(url)) return url;
    if (url.startsWith("//")) return "https:" + url;
    return url;
  }

  function __cleanTitle(v) {
    return (v || "").replace(/[^\p{L}\p{N}\x27’]+/gu, " ").trim();
  }

  function __mapItem(item) {
    if (!item) return null;
    const id = item.mangaId || item.id;
    const title = item.title || item.primaryTitle || id;
    if (!id || !title) return null;
    return {
      id: String(id),
      title: __cleanTitle(title),
      cover: __absUrl(item.imageUrl || item.thumbnailUrl || item.cover)
    };
  }

  // 2. Mocked Paperback Application Host Bridge
  const Application = {
    arrayBufferToUTF8String(buf) {
      if (!buf) return "";
      return new TextDecoder().decode(buf);
    },
    decodeHTMLEntities(str) {
      if (!str) return "";
      return str
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, " ")
        .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
        .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
    },
    async getDefaultUserAgent() {
      return "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
    },
    getState(key, def) {
      if (typeof harbor !== "undefined" && typeof harbor.getPreference === "function") {
        try {
          const val = harbor.getPreference(key, undefined);
          if (val !== undefined && val !== null && val !== "") return val;
        } catch (_) {}
      }
      return __stateStore.has(key) ? __stateStore.get(key) : def;
    },
    setState(val, key) {
      __stateStore.set(key, val);
    },
    isResourceLimited: false,
    registerInterceptor(i) {
      __interceptors.add(i);
    },
    unregisterInterceptor(i) {
      __interceptors.delete(i);
    },
    Selector(target, method) {
      return typeof target[method] === "function" ? target[method].bind(target) : () => {};
    },
    SelectorRegistry: {},
    formDidChange() {},
    sleep(ms) {
      return new Promise((r) => setTimeout(r, ms));
    },
    async scheduleRequest(req) {
      let url = req.url;
      if (typeof harbor !== "undefined" && typeof harbor.getPreference === "function") {
        try {
          const customMirror = harbor.getPreference("mirrorUrl", "");
          if (customMirror && typeof customMirror === "string" && customMirror.trim()) {
            const mirrorBase = customMirror.trim().replace(/[/]+$/, "");
            const parsedMirror = mirrorBase.startsWith("http") ? mirrorBase : "https://" + mirrorBase;
            const urlObj = new URL(url);
            const mirrorObj = new URL(parsedMirror);
            url = url.replace(urlObj.origin, mirrorObj.origin);
          }
        } catch (_) {}
      }

      const method = req.method || "GET";
      const headers = req.headers || {};
      const body = req.body;

      const res = await harbor.http(url, {
        method,
        headers,
        body,
        responseType: "text",
        timeoutMs: req.timeoutMs || 25000,
      });

      const bodyBytes = new TextEncoder().encode(res.body || "").buffer;
      const responseObj = {
        status: res.status,
        ok: res.ok,
        headers: res.headers || {},
      };

      return [responseObj, bodyBytes];
    },
  };

  // 3. Evaluate upstream Paperback source bundle
  const __realG = (typeof globalThis === "object" && globalThis) ? globalThis : null;
const __executeUpstream = function (Application) {
  var globalThis = this;
  var self = this;
  var App;
  try { Object.defineProperty(this, "App", { configurable: true, enumerable: true, get: function () { return App; }, set: function (v) { App = v; } }); } catch (_) {}
var source=(function(e){Object.defineProperty(e,Symbol.toStringTag,{value:`Module`});function t(e){"@babel/helpers - typeof";return t=typeof Symbol==`function`&&typeof Symbol.iterator==`symbol`?function(e){return typeof e}:function(e){return e&&typeof Symbol==`function`&&e.constructor===Symbol&&e!==Symbol.prototype?`symbol`:typeof e},t(e)}function n(e,n){if(t(e)!=`object`||!e)return e;var r=e[Symbol.toPrimitive];if(r!==void 0){var i=r.call(e,n||`default`);if(t(i)!=`object`)return i;throw TypeError(`@@toPrimitive must return a primitive value.`)}return(n===`string`?String:Number)(e)}function r(e){var r=n(e,`string`);return t(r)==`symbol`?r:r+``}function i(e,t,n){return(t=r(t))in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}var a=class{constructor(){i(this,`requiresExplicitSubmission`,!1)}reloadForm(){let e=this.__underlying_formId;e&&Application.formDidChange(e)}};function o(e,t,n){return e[`__closure_selector-`+t]=n,Application.Selector(e,`__closure_selector-`+t)}function s(e,t){let n;return n=typeof e==`string`?{id:e}:e,{type:`listSection`,...n,items:t.filter(e=>e),allowAddition:!1,allowDeletion:!1,allowReorder:!1}}function c(e,t){let n;return n=typeof e==`string`?{id:e}:e,{type:`flowSection`,...n,items:t.filter(e=>e)}}function l(e,t){if(t.maxItemCount<1)throw Error(`[${t.id}] maxItemCount must not be less than one`);if(t.minItemCount<0)throw Error(`[${t.id}] minItemCount must not be less than zero`);if(t.minItemCount>=t.maxItemCount&&t.maxItemCount>1)throw Error(`[${t.id}] minItemCount must be less than maxItemCount, or both must be one`);if(t.value.length<t.minItemCount)throw Error(`[${t.id}] value count must not be less than minItemCount`);if(!t.value.every(e=>t.items.some(t=>t.id===e)))throw Error(`[${t.id}] All provided values must be inside items`);let n=Object.keys(t.value).length;return(t.layout==`flow`?c:s)({id:t.id,header:t.header,footer:t.footer},t.items.map(r=>{let i=t.value.indexOf(r.id),a=i!==-1;return d(r.id,{title:r.title,value:a?{symbol:`checkmark`,style:`success`}:void 0,onSelect:o(e,`__select_${t.id}#${r.id}`,async()=>{if(a)n>t.minItemCount&&t.value.splice(i,1);else if(t.maxItemCount==1)t.value.splice(0,t.value.length,r.id);else if(n<t.maxItemCount)t.value.push(r.id);else return;t.onValueChange&&await Application.SelectorRegistry.selector(t.onValueChange)(),e.reloadForm()})})}))}function u(e,t){let n=Object.keys(t.value).length;return(t.layout==`flow`?c:s)({id:t.id,header:t.header,footer:t.footer},t.items.map(r=>{let i=t.value[r.id],a,s;switch(i){case`included`:t.layout==`flow`?(s=`success`,a=void 0):(s=void 0,a={symbol:`checkmark`,style:`success`});break;case`excluded`:t.layout==`flow`?(s=`error`,a=void 0):(s=void 0,a={symbol:`xmark`,style:`error`});break;default:a=void 0,s=void 0;break}return d(r.id,{style:s,title:r.title,value:a,onSelect:o(e,`__multiselect_${t.id}#${r.id}`,async()=>{let a,o=!t.maximum||n<t.maximum,s=t.allowEmptySelection&&n==1||n>1;switch(i){case`included`:if(t.allowExclusion){a=`excluded`;break}if(s){a=void 0;break}else return;case`excluded`:if(s){a=void 0;break}else return;case void 0:if(o){a=`included`;break}else return}a==null?delete t.value[r.id]:t.value[r.id]=a,t.onValueChange&&await Application.SelectorRegistry.selector(t.onValueChange)(),e.reloadForm()})})}))}function d(e,t){return{...t,id:e,type:`labelRow`,isHidden:t.isHidden??!1,isSelectable:t.onSelect!=null}}function ee(e,t){return{...t,id:e,type:`inputRow`,isHidden:t.isHidden??!1}}function te(e,t){let n=Object.keys(t.value).length;return re(e,{form:new ie(t.title,t),title:t.title,subtitle:t.subtitle,value:n==1?`${(`items`in t?t.items.find(e=>e.id==t.value[0])?.title:t.options.find(e=>e.id==t.value[0])?.title)??`1 item`}`:`${Object.keys(t.value).length} items`,isHidden:t.isHidden})}function f(e,t){return re(e,{form:new ae(t.title,t),title:t.title,subtitle:t.subtitle,value:`${Object.keys(t.value).length} items`,isHidden:t.isHidden})}function ne(e,t){return{...t,id:e,type:`buttonRow`,isHidden:t.isHidden??!1}}function re(e,t){return{...t,id:e,type:`navigationRow`,isHidden:t.isHidden??!1}}var ie=class extends a{constructor(e,t){super(),i(this,`title`,void 0),i(this,`params`,void 0),i(this,`states`,[]),i(this,`requiresExplicitSubmission`,!0),this.title=e,this.params=t,this.states=[...t.value]}getSections(){return[l(this,{id:`select`,value:this.states,layout:`layout`in this.params?this.params.layout:`list`,items:`items`in this.params?this.params.items:this.params.options,minItemCount:this.params.minItemCount,maxItemCount:this.params.maxItemCount,isHidden:this.params.isHidden})]}async formDidSubmit(){await Application.SelectorRegistry.selector(this.params.onValueChange)(this.states)}},ae=class extends a{constructor(e,t){super(),i(this,`title`,void 0),i(this,`params`,void 0),i(this,`states`,{}),i(this,`requiresExplicitSubmission`,!0),this.title=e,this.params=t,this.states={...t.value}}getSections(){return[u(this,{id:`multiselect`,value:this.states,items:this.params.items,allowExclusion:this.params.allowExclusion,allowEmptySelection:this.params.allowEmptySelection,maximum:this.params.maximum,layout:this.params.layout})]}async formDidSubmit(){await Application.SelectorRegistry.selector(this.params.onValueChange)(this.states)}},oe=class extends a{constructor(...e){super(...e),i(this,`requiresExplicitSubmission`,!0)}async formDidSubmit(){}formDidCancel(){}},p=class{constructor(e){i(this,`id`,void 0),this.id=e}registerInterceptor(){Application.registerInterceptor(this.id,Application.Selector(this,`interceptRequest`),Application.Selector(this,`interceptResponse`))}unregisterInterceptor(){Application.unregisterInterceptor(this.id)}};let m={},h={},se=async e=>{if(m[e]){await m[e],await se(e);return}m[e]=new Promise(t=>h[e]=()=>{delete m[e],t()})},ce=e=>{h[e]&&h[e]()};var le=class extends p{constructor(e,t){super(e),i(this,`options`,void 0),i(this,`promise`,void 0),i(this,`currentRequestsMade`,0),i(this,`lastReset`,Date.now()),i(this,`imageRegex`,new RegExp(/\.(avif|gif|jpeg|jpg|jxl|png|webp)(\?|$)/i)),this.options=t}async interceptRequest(e){return this.options.ignoreImages&&this.imageRegex.test(e.url)?e:(await se(this.id),await this.incrementRequestCount(),ce(this.id),e)}async interceptResponse(e,t,n){return n}async incrementRequestCount(){if(await this.promise,(Date.now()-this.lastReset)/1e3>this.options.bufferInterval&&(this.currentRequestsMade=0,this.lastReset=Date.now()),this.currentRequestsMade+=1,this.currentRequestsMade>=this.options.numberOfRequests){let e=(Date.now()-this.lastReset)/1e3;if(e<=this.options.bufferInterval){let t=this.options.bufferInterval-e;console.log(`[BasicRateLimiter] rate limit hit, sleeping for ${t}`),this.promise=Application.sleep(t)}}}},g=class extends Error{constructor(e,t=`Cloudflare bypass is required`){super(t),i(this,`resolutionRequest`,void 0),i(this,`type`,`cloudflareError`),this.resolutionRequest=e}};function _(e){let t={},n=e.match(/^(?:([a-zA-Z][a-zA-Z\d+\-.]*):)?(?:\/\/([^/?#]*))?([^?#]*)(?:\?([^#]*))?(?:#(.*))?$/);if(!n)throw Error(`Invalid URL string provided.`);if(n[1]!==void 0&&n[1]!==``&&(t.protocol=n[1]),n[2]!==void 0&&n[2]!==``){let e=n[2],r=``,i=``,a=e.indexOf(`@`);if(a!==-1){if(r=e.substring(0,a),i=e.substring(a+1),r!==``){let e=r.indexOf(`:`);e===-1?(t.username=r,t.password=``):(t.username=r.substring(0,e),t.password=r.substring(e+1))}}else i=e;if(i!==``)if(i.startsWith(`[`)){let e=i.indexOf(`]`);if(e===-1)throw Error(`Invalid IPv6 address in URL update.`);t.hostname=i.substring(0,e+1);let n=i.substring(e+1);n.startsWith(`:`)&&(t.port=n.substring(1))}else{let e=i.lastIndexOf(`:`);e!==-1&&i.indexOf(`:`)===e?(t.hostname=i.substring(0,e),t.port=i.substring(e+1)):(t.hostname=i,t.port=``)}}if(n[3]!==void 0&&n[3]!==``&&(t.path=n[3].startsWith(`/`)?n[3]:`/${n[3]}`),n[4]!==void 0){let e={},r=n[4].split(`&`);for(let t of r){if(!t)continue;let[n,...r]=t.split(`=`),i=r.join(`=`);if(n===void 0)continue;let a=decodeURIComponent(n),o=decodeURIComponent(i);if(a in e){let t=e[a];Array.isArray(t)?t.push(o):e[a]=[t,o]}else e[a]=o}t.queryItems=e}return n[5]!==void 0&&(t.fragment=n[5]),t}var v=class{constructor(e){i(this,`protocol`,void 0),i(this,`hostname`,void 0),i(this,`path`,void 0),i(this,`username`,void 0),i(this,`password`,void 0),i(this,`port`,void 0),i(this,`queryItems`,void 0),i(this,`fragment`,void 0);let t=_(e);if(!t.hostname||!t.protocol)throw Error(`URL Hostname and Protocol are required`);this.hostname=t.hostname,this.protocol=t.protocol,this.path=t.path??``,this.username=t.username,this.password=t.password,this.port=t.port,this.queryItems=t.queryItems,this.fragment=t.fragment}toString(){let e=`${this.protocol}://`;if(this.username!==void 0&&this.username!==``&&(e+=this.username,this.password!==void 0&&this.password!==``&&(e+=`:${this.password}`),e+=`@`),e+=this.hostname,this.port!==void 0&&this.port!==``&&(e+=`:${this.port}`),this.path!==``&&(e+=this.path.startsWith(`/`)?this.path:`/${this.path}`),this.queryItems!==void 0){let t=Object.keys(this.queryItems),n=[];if(t.length>0)for(let e of t){let t=this.queryItems[e];if(Array.isArray(t))for(let r of t)n.push(`${encodeURIComponent(e)}=${encodeURIComponent(r)}`);else t!==void 0&&n.push(`${encodeURIComponent(e)}=${encodeURIComponent(t)}`)}e+=`?${n.join(`&`)}`}return this.fragment!==void 0&&(e+=`#${this.fragment}`),e}setProtocol(e){if(e===``)throw Error(`Protocol is required`);return this.protocol=e,this}setUsername(e){return e===``?this.username=void 0:this.username=e,this}setPassword(e){return e===``?this.password=void 0:this.password=e,this}setHostname(e){if(e===``)throw Error(`Hostname is required`);return this.hostname=e,this}setPort(e){return e===``?this.port=void 0:this.port=e,this}setPath(e){return this.path=e.startsWith(`/`)?e:`/${e}`,this}addPathComponent(e){return this.path=(this.path??``)+(e.startsWith(`/`)?e:`/${e}`),this}setQueryItems(e){return this.queryItems=e,this}setQueryItem(e,t){return this.queryItems===void 0&&(this.queryItems={}),this.queryItems[e]=t,this}removeQueryItem(e){return delete this.queryItems?.[e],this}setFragment(e){return this.fragment=e,this}update(e){let t;return t=typeof e==`string`?_(e):e,t.protocol!==void 0&&this.setProtocol(t.protocol),t.username!==void 0&&this.setUsername(t.username),t.password!==void 0&&this.setPassword(t.password),t.hostname!==void 0&&this.setHostname(t.hostname),t.port!==void 0&&this.setPort(t.port),t.path!==void 0&&this.setPath(t.path),t.queryItems!==void 0&&this.setQueryItems(t.queryItems),t.fragment!==void 0&&this.setFragment(t.fragment),this}};let y=`cookie_store_cookies`;var ue=class extends p{get cookies(){return Object.values(this._cookies).map(e=>({...e,expires:e.expires?new Date(e.expires):void 0}))}set cookies(e){let t={};for(let n of e)this.isCookieExpired(n)||(t[this.cookieIdentifier(n)]=n);this._cookies=t,this.saveCookiesToStorage()}constructor(e){super(`cookie_store`),i(this,`options`,void 0),i(this,`_cookies`,{}),this.options=e,this.loadCookiesFromStorage()}async interceptRequest(e){return e.cookies={...this.cookiesForUrl(e.url).reduce((e,t)=>(e[t.name]=t.value,e),{}),...e.cookies??{}},e}async interceptResponse(e,t,n){let r=this._cookies;for(let e of t.cookies){let t=this.cookieIdentifier(e);if(this.isCookieExpired(e)){delete r[t];continue}r[t]=e}return this._cookies=r,this.saveCookiesToStorage(),n}setCookie(e){let t=this.cookieIdentifier(e);this.isCookieExpired(e)?delete this._cookies[t]:this._cookies[t]=e,this.saveCookiesToStorage()}deleteCookie(e){delete this._cookies[this.cookieIdentifier(e)],this.saveCookiesToStorage()}cookiesForUrl(e){let t=new v(e),n=t.hostname;if(!n)return[];let r={},i=t.path.startsWith(`/`)?t.path:`/${t.path}`,a=n.split(`.`);i.split(`/`).shift();let o=!1,s=this.cookies;for(let e of s){if(this.isCookieExpired(e)){delete this._cookies[this.cookieIdentifier(e)],o=!0;continue}let t=this.cookieSanitizedDomain(e).split(`.`);if(a.length<t.length||t.length==0)continue;let n=!0;for(let e=0;e<t.length;e++){let r=t.length-1-e,i=a.length-1-e;if(t[r]!=a[i]){n=!1;break}}if(!n)continue;let s=this.cookieSanitizedPath(e);if(!(i===s||i.startsWith(s)&&(s.endsWith(`/`)||i[s.length]===`/`)))continue;let c=r[e.name];(!c||s.length>c.pathLength)&&(r[e.name]={cookie:e,pathLength:s.length})}return o&&this.saveCookiesToStorage(),Object.values(r).map(e=>e.cookie)}cookieIdentifier(e){let t=this.cookieSanitizedDomain(e),n=this.cookieSanitizedPath(e);return`${e.name}-${t}-${n}`}cookieSanitizedPath(e){return e.path?.startsWith(`/`)?e.path:`/`+(e.path??``)}cookieSanitizedDomain(e){return e.domain.replace(/^(www)?\.?/gi,``).toLowerCase()}isCookieExpired(e){return!!(e.expires&&e.expires.getTime()<=Date.now())}loadCookiesFromStorage(){if(this.options.storage==`memory`)return;let e=Application.getState(y);if(!e){this._cookies={};return}let t={};for(let n of e)!n.expires||this.isCookieExpired(n)||(t[this.cookieIdentifier(n)]=n);this._cookies=t}saveCookiesToStorage(){this.options.storage!=`memory`&&Application.setState(this.cookies.filter(e=>e.expires),y)}},b;(function(e){e[e.NONE=0]=`NONE`,e[e.MANGA_CHAPTERS=1]=`MANGA_CHAPTERS`,e[e.CHAPTER_PROVIDING=1]=`CHAPTER_PROVIDING`,e[e.MANGA_PROGRESS=2]=`MANGA_PROGRESS`,e[e.MANGA_PROGRESS_PROVIDING=2]=`MANGA_PROGRESS_PROVIDING`,e[e.PROGRESS_PROVIDING=2]=`PROGRESS_PROVIDING`,e[e.DISCOVER_SECIONS=4]=`DISCOVER_SECIONS`,e[e.DISCOVER_SECIONS_PROVIDING=4]=`DISCOVER_SECIONS_PROVIDING`,e[e.DISCOVER_SECTION_PROVIDING=4]=`DISCOVER_SECTION_PROVIDING`,e[e.COLLECTION_MANAGEMENT=8]=`COLLECTION_MANAGEMENT`,e[e.MANAGED_COLLECTION_PROVIDING=8]=`MANAGED_COLLECTION_PROVIDING`,e[e.CLOUDFLARE_BYPASS_REQUIRED=16]=`CLOUDFLARE_BYPASS_REQUIRED`,e[e.CLOUDFLARE_BYPASS_PROVIDING=16]=`CLOUDFLARE_BYPASS_PROVIDING`,e[e.SETTINGS_UI=32]=`SETTINGS_UI`,e[e.SETTINGS_FORM_PROVIDING=32]=`SETTINGS_FORM_PROVIDING`,e[e.MANGA_SEARCH=64]=`MANGA_SEARCH`,e[e.SEARCH_RESULTS_PROVIDING=64]=`SEARCH_RESULTS_PROVIDING`,e[e.SEARCH_RESULT_PROVIDING=64]=`SEARCH_RESULT_PROVIDING`})(b||(b={}));var x;(function(e){e.EVERYONE=`SAFE`,e.MATURE=`MATURE`,e.ADULT=`ADULT`})(x||(x={}));var S;(function(e){e[e.featured=0]=`featured`,e[e.simpleCarousel=1]=`simpleCarousel`,e[e.prominentCarousel=2]=`prominentCarousel`,e[e.chapterUpdates=3]=`chapterUpdates`,e[e.genres=4]=`genres`})(S||(S={})),Object.freeze({items:[],metadata:void 0});let C=`https://cdn.scans.gg/uploads`,w={POPULAR:`popular`,POPULAR_RANGES:`popular_ranges`,LATEST:`latest`,ALL_SERIES:`all_series`,GENRES:`genres`},de=`scansgg.baseUrlOverride`,T=`scansgg.apiUrlOverride`,E=`scansgg.hiddenGenres`,D=`Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36`,O={1:`Comic`,2:`Manga`,3:`Manhwa`,4:`Manhua`,5:`Webtoon`},fe=Object.entries(O).map(([e,t])=>({id:e,value:t})),k={1:`Ongoing`,2:`Completed`,3:`Hiatus`,4:`Cancelled`,5:`Dropped`},pe=Object.entries(k).map(([e,t])=>({id:e,value:t})),me=[{id:`daily`,value:`1 Day`},{id:`weekly`,value:`7 Days`},{id:`monthly`,value:`1 Month`},{id:`3months`,value:`3 Months`},{id:`6months`,value:`6 Months`},{id:`1year`,value:`1 Year`}],A={1:`Fantasy`,2:`Romance`,3:`Shoujo`,4:`Comedy`,5:`Drama`,6:`Slice Of Life`,7:`School Life`,8:`Thriller`,9:`Josei`,10:`Action`,11:`Seinen`,12:`Historical`,13:`Shounen`,14:`Sports`,15:`Supernatural`,16:`Adventure`,17:`Sci-fi`,18:`Martial Arts`,19:`Mystery`,20:`Horror`,21:`Mature`,22:`Psychological`,23:`Suspense`,24:`Gender Bender`,25:`Tragedy`,26:`Harem`,27:`Boys Love`,28:`Shounen Ai`,29:`Yaoi`,30:`Shoujo Ai`,31:`Yuri`,32:`Gourmet`,33:`Adult`,34:`Erotica`,35:`Smut`,36:`Music`,37:`Ecchi`,38:`Shotacon`,39:`Mecha`,40:`Hentai`,41:`Girls Love`,42:`Doujinshi`,43:`Mahou Shoujo`,44:`Lolicon`,45:`Award Winning`,46:`Avant Garde`,47:`Survival`,48:`Male Protagonist`,49:`Regression`},j=Object.entries(A).map(([e,t])=>({id:e,value:t})).sort((e,t)=>e.value.localeCompare(t.value)),he=new Set([33,34,35,38,40,44]),M=new Set([21,24,27,28,29,30,31,37,42]),N=e=>e!=null&&e in k?k[e]:`Unknown`,P=e=>e.map(e=>({id:e.id,title:e.value})),ge=P(fe),_e=P(pe),ve=P(j),ye=[{id:`and`,title:`AND`},{id:`or`,title:`OR`}];var be=class extends oe{constructor(e){super(),i(this,`types`,void 0),i(this,`statuses`,void 0),i(this,`tags`,void 0),i(this,`tagMatchMode`,void 0),i(this,`popularRange`,void 0);let t=e.metadata??{};this.types={...t.types},this.statuses={...t.statuses},this.tags={...t.tags},this.tagMatchMode=[t.tagMatchMode??`and`],this.popularRange=t.popularRange}getSections(){return[s(`type`,[f(`types`,{title:`Type`,layout:`flow`,value:this.types,items:ge,allowExclusion:!0,allowEmptySelection:!0,onValueChange:Application.Selector(this,`handleTypesChange`)})]),s(`status`,[f(`statuses`,{title:`Status`,layout:`flow`,value:this.statuses,items:_e,allowExclusion:!0,allowEmptySelection:!0,onValueChange:Application.Selector(this,`handleStatusesChange`)})]),s(`tags`,[f(`tags`,{title:`Tags`,layout:`flow`,value:this.tags,items:ve,allowExclusion:!0,allowEmptySelection:!0,onValueChange:Application.Selector(this,`handleTagsChange`)})]),l(this,{id:`tag_match_mode`,footer:`AND requires every included tag. OR requires at least one included tag.`,layout:`flow`,value:this.tagMatchMode,items:ye,minItemCount:1,maxItemCount:1})]}async handleTypesChange(e){this.types=e}async handleStatusesChange(e){this.statuses=e}async handleTagsChange(e){this.tags=e}getSearchQueryMetadata(){let e={};return this.popularRange&&(e.popularRange=this.popularRange),Object.keys(this.types).length>0&&(e.types=this.types),Object.keys(this.statuses).length>0&&(e.statuses=this.statuses),Object.keys(this.tags).length>0&&(e.tags=this.tags,e.tagMatchMode=this.tagMatchMode[0]??`and`),e}};let xe=[{id:`safe`,title:`SFW`},{id:`all`,title:`All Content`}],Se=j.map(e=>({id:e.id,title:e.value})),Ce=new Set(j.map(e=>e.id)),F=e=>{let t=Application.getState(e);if(typeof t==`string`){let e=t.trim().replace(/\/+$/,``);if(e.length>0)return e}},I=()=>F(`scansgg.baseUrlOverride`)??`https://scans.gg`,L=()=>F(`scansgg.apiUrlOverride`)??`https://api.scans.gg`,R=()=>Application.getState(`scansgg.contentPreference`)===`all`?`all`:`safe`,z=()=>{let e=Application.getState(E);return Array.isArray(e)?e.filter(e=>typeof e==`string`&&Ce.has(e)):[]},B=(e,t)=>{let n=t.trim().replace(/\/+$/,``);if(n.length===0)return Application.setState(``,e),``;/^https?:\/\//i.test(n)||(n=`https://${n}`);try{new v(n).toString()}catch{return}return Application.setState(n,e),n};var we=class extends a{constructor(){super(),i(this,`baseUrl`,void 0),i(this,`apiUrl`,void 0),i(this,`contentPreference`,void 0),i(this,`hiddenGenreIds`,void 0),this.baseUrl=F(`scansgg.baseUrlOverride`)??``,this.apiUrl=F(`scansgg.apiUrlOverride`)??``,this.contentPreference=R(),this.hiddenGenreIds=z()}getSections(){return[s({id:`content`,header:`Content Preference`,footer:`SFW shows only titles rated safe. All Content allows every rating. Selected genres are always hidden from discover and search.`},[te(`content_preference`,{title:`Content Rating`,layout:`list`,value:[this.contentPreference],items:xe,minItemCount:1,maxItemCount:1,onValueChange:Application.Selector(this,`updateContentPreference`)}),te(`hidden_genres`,{title:`Hide Genres`,subtitle:`Exclude selected genres from discover and search`,layout:`list`,value:this.hiddenGenreIds,items:Se,minItemCount:0,maxItemCount:Se.length,onValueChange:Application.Selector(this,`updateHiddenGenres`)})]),s({id:`base_url`,footer:`Override the website address if Scans.GG has moved. Leave empty for the default (https://scans.gg). Include the scheme, e.g. https://scans.gg`},[ee(`base_url_input`,{title:`Website URL`,value:this.baseUrl,onValueChange:Application.Selector(this,`updateBaseUrl`)}),d(`base_url_current`,{title:`Currently using`,value:I()})]),s({id:`api_url`,footer:`Override the API address only if the default stops responding. Leave empty for the default (https://api.scans.gg).`},[ee(`api_url_input`,{title:`API URL`,value:this.apiUrl,onValueChange:Application.Selector(this,`updateApiUrl`)}),d(`api_url_current`,{title:`Currently using`,value:L()}),ne(`reset`,{title:`Reset to defaults`,onSelect:Application.Selector(this,`resetOverrides`)})])]}async updateBaseUrl(e){let t=B(de,e);t!==void 0&&(this.baseUrl=t,Application.invalidateDiscoverSections()),this.reloadForm()}async updateApiUrl(e){let t=B(T,e);t!==void 0&&(this.apiUrl=t,Application.invalidateDiscoverSections()),this.reloadForm()}async updateContentPreference(e){this.contentPreference=e[0]===`all`?`all`:`safe`,Application.setState(this.contentPreference,`scansgg.contentPreference`),Application.invalidateDiscoverSections(),this.reloadForm()}async updateHiddenGenres(e){this.hiddenGenreIds=e.filter(e=>Ce.has(e)),Application.setState(this.hiddenGenreIds,E),Application.invalidateDiscoverSections(),this.reloadForm()}async resetOverrides(){this.baseUrl=``,this.apiUrl=``,B(de,``),B(T,``),Application.invalidateDiscoverSections(),this.reloadForm()}};let Te=/\.(jpe?g|png|webp|gif|avif|bmp|svg)(\?|#|$)/i;var Ee=class extends p{async interceptRequest(e){let t=I(),n=e.url.startsWith(L()),r=Te.test(e.url),i=n?`application/json, text/plain, */*`:r?`image/avif,image/webp,image/apng,image/png,image/svg+xml,*/*;q=0.8`:`text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8`,a={...e.headers,referer:`${t}/`,"user-agent":D,accept:i,"accept-language":`en-US,en;q=0.5`};return n&&(a.origin=t),{...e,headers:a}}async interceptResponse(e,t,n){if(t.headers?.[`cf-mitigated`]===`challenge`)throw new g({url:e.url,method:e.method??`GET`,headers:{"user-agent":D}});return n}};let V=async(e,t={})=>{let n=new v(L()).addPathComponent(e);for(let[e,r]of Object.entries(t)){if(r===void 0)continue;let t=Array.isArray(r)?`[${r.join(`,`)}]`:String(r);n.setQueryItem(e,t)}let r=n.toString(),[i,a]=await Application.scheduleRequest({url:r,method:`GET`});if(i.status===404)throw Error(`Content not found: ${r}`);if(i.status<200||i.status>=300)throw Error(`Request failed with status ${i.status}: ${r}`);let o=Application.arrayBufferToUTF8String(a);try{return JSON.parse(o)}catch(e){if(/^\s*<(?:!doctype|html)/i.test(o))throw new g({url:r,method:`GET`,headers:{"user-agent":D}});let t=e instanceof Error?e.message:String(e);throw Error(`Failed to parse JSON from ${r}: ${t}`,{cause:e})}},H=()=>({allowAllContent:R()===`all`,hiddenGenreIds:new Set(z().map(Number))}),U=(e,t)=>Object.entries(e??{}).filter(([,e])=>e===t).map(([e])=>e),De=(e,t)=>{let n=Number(e);return t.hiddenGenreIds.has(n)?!1:t.allowAllContent?!0:!he.has(n)&&!M.has(n)},W=(e,t)=>{let n=e==null?void 0:String(e),r=U(t,`included`),i=new Set(U(t,`excluded`));return n!==void 0&&i.has(n)?!1:r.length===0||n!==void 0&&r.includes(n)},Oe=(e,t)=>{let n=U(t?.tags,`included`).map(Number);return U(t?.tags,`excluded`).map(Number).some(t=>e.has(t))?!1:n.length===0?!0:t?.tagMatchMode===`or`?n.some(t=>e.has(t)):n.every(t=>e.has(t))},G=(e,t,n)=>{if(!n.allowAllContent&&X(e)!==x.EVERYONE)return!1;let r=new Set(e.tags??[]);return[...n.hiddenGenreIds].some(e=>r.has(e))||!W(e.type,t?.types)||!W(e.status,t?.statuses)?!1:Oe(r,t)},K=e=>`imageUrl`in e&&e.imageUrl.length>0,ke=e=>Application.decodeHTMLEntities(e).toLowerCase().normalize(`NFKD`).replace(/[̀-ͯ]/g,``).replace(/['’‘"“”]/g,``).replace(/[^a-z0-9]+/g,`-`).replace(/^-+|-+$/g,``),q=(e,t)=>{let n=ke(t);return n.length>0?`${e}-${n}`:`${e}-series`},J=e=>e.match(/^\d+/)?.[0]??e,Ae=(e,t,n)=>`${e}:${t}:${n??0}`,je=e=>{let[t,n,r]=e.split(`:`);if(!t||!n||r===void 0)throw Error(`Invalid Scans.GG chapter id: ${e}`);return{seriesId:t,chapterId:n,groupId:r}},Y=e=>e?/^https?:\/\//i.test(e)?e:`${C}/covers/${e}`:``,Me=e=>{let t=typeof e==`number`?e:Number.parseFloat(e);return String(Number.isFinite(t)?t:e)},Ne=e=>{let t=typeof e==`number`?e:Number.parseFloat(e);return Number.isFinite(t)?t:0},Pe=e=>{if(!e)return;let t=e.includes(`T`)?e:e.replace(` `,`T`),n=/[zZ]|[+-]\d{2}:?\d{2}$/.test(t)?t:`${t}Z`,r=new Date(n);return Number.isNaN(r.getTime())?void 0:r},Fe=e=>e?Application.decodeHTMLEntities(e.replace(/<br\s*\/?>/gi,`
`).replace(/<\/p>/gi,`

`).replace(/<[^>]+>/g,``).trim()):``,X=e=>{let t=e.content_rating??0,n=e.tags;return t>=4||n?.some(e=>he.has(e))?x.ADULT:t>=2||n?.some(e=>M.has(e))?x.MATURE:x.EVERYONE},Ie=e=>(e??[]).map(e=>A[e]).filter(e=>!!e),Le=e=>{let t=[...new Set((e??[]).map(e=>e.trim()).filter(Boolean))];return t.length>0?Application.decodeHTMLEntities(t.join(`, `)):void 0},Z=e=>{if(!e)return;let t=[e.group?.title,...(e.collab_groups??[]).map(e=>e.title)].map(e=>e?.trim()).filter(e=>!!e),n=[...new Set(t)];return n.length>0?Application.decodeHTMLEntities(n.join(`, `)):void 0},Re=e=>{if(!(e==null||!Number.isFinite(e)||e<0))return Math.trunc(e).toLocaleString(`en-US`)},ze=e=>{let t=Re(e.popular_views??e.views),n=Z(e.chapters?.[0]),r=[t?{symbol:`eye.fill`,text:t}:void 0,n?{symbol:`person.2.fill`,text:n}:void 0].filter(e=>!!e);if(r.length!==0)return r},Be=e=>{if(!(e.rating_count==null||e.rating_count<=0)&&!(e.rating==null||!Number.isFinite(e.rating)))return Math.min(1,Math.max(0,e.rating/5))},Q=e=>{let t=e.type==null?void 0:O[e.type];if(t)return t;let n=N(e.status);return n===`Unknown`?void 0:n},$=e=>({mangaId:q(e.id,e.title),title:Application.decodeHTMLEntities(e.title),imageUrl:Y(e.cover),subtitle:Q(e),contentRating:X(e)}),Ve=e=>({type:`featuredCarouselItem`,mangaId:q(e.id,e.title),title:Application.decodeHTMLEntities(e.title),imageUrl:Y(e.cover),supertitle:Le(e.author)??Q(e),summary:Fe(e.summary)||void 0,infoItems:ze(e),contentRating:X(e)}),He=e=>({type:`simpleCarouselItem`,mangaId:q(e.id,e.title),title:Application.decodeHTMLEntities(e.title),imageUrl:Y(e.cover),subtitle:Q(e),contentRating:X(e)}),Ue=e=>{let t=e.chapters?.[0];if(!t?.id)return He(e);let n=t.number==null?void 0:`Ch. ${Me(t.number)}`,r=Z(t);return{type:`chapterUpdatesCarouselItem`,mangaId:q(e.id,e.title),chapterId:Ae(String(e.id),t.id,t.group_id),title:Application.decodeHTMLEntities(e.title),imageUrl:Y(e.cover),subtitle:[n,r].filter(Boolean).join(` | `)||void 0,publishDate:Pe(t.updated_at??t.created_at),contentRating:X(e)}},We=e=>{let t=e.type==null?void 0:O[e.type],n=[...t?[t]:[],...Ie(e.tags),...(e.themes??[]).map(e=>e.trim()).filter(e=>e.length>0)],r=[...new Set(n)].map(e=>({id:e.toLowerCase().replace(/\s+/g,`-`),title:e})),i=[...new Set((e.alternative_titles??[]).map(e=>(e.title??``).trim()).filter(e=>e.length>0))],a=(e.author??[]).filter(Boolean).join(`, `),o=(e.artist??[]).filter(Boolean).join(`, `),s=q(e.id,e.title);return{mangaId:s,mangaInfo:{primaryTitle:Application.decodeHTMLEntities(e.title),isWebtoon:/^(?:manhwa|manhua|webtoon)$/i.test(O[e.type??0]??``),secondaryTitles:i,thumbnailUrl:Y(e.cover),synopsis:Fe(e.summary),author:a.length>0?a:void 0,artist:o.length>0?o:void 0,status:N(e.status),rating:Be(e),contentRating:X(e),tagGroups:r.length>0?[{id:`tags`,title:`Tags`,tags:r}]:[],shareUrl:`${I()}/series/${s}`}}},Ge=e=>{let t=e.title?.trim();if(!t)return{};let n=t.indexOf(`•`),r=(n===-1?t:t.slice(0,n)).trim(),i=n===-1?``:t.slice(n+1).trim(),a=/^(?:chapter|chap\.?|ch\.?|episode|ep\.?)?\s*[\d.]+$/i.test(r);return{title:r&&!a?Application.decodeHTMLEntities(r):void 0,group:i?Application.decodeHTMLEntities(i):void 0}},Ke=e=>Z(e)??Ge(e).group,qe=(e,t,n)=>e.map((r,i)=>({chapterId:Ae(n,r.id,r.group_id),sourceManga:t,title:Ge(r).title,version:Ke(r)??`Unknown`,chapNum:Ne(r.number),volume:0,langCode:`en`,sortingIndex:e.length-i,publishDate:Pe(r.created_at)})),Je=(e,t)=>{let n=e.chapter,r=n?.id??Number(t),i=[...n?.pages??[]].sort((e,t)=>e.position-t.position).map(e=>`${C}/pages/${r}/${e.path}`);if(i.length===0)throw Error(`No pages returned for chapter ${t}.`);return i},Ye=e=>{let t=e.match(/<script[^>]+id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);if(!t?.[1])return[];let n;try{let e=JSON.parse(t[1]);if(!Array.isArray(e))return[];n=e}catch{return[]}let r=new Set,i=[];for(let e of n){if(!e||typeof e!=`object`||Array.isArray(e))continue;let t=e;if(typeof t.position!=`number`||typeof t.path!=`number`)continue;let a=n[t.position],o=n[t.path];typeof a!=`number`||typeof o!=`string`||o.length===0||r.has(o)||(r.add(o),i.push({position:a,path:o}))}return i.sort((e,t)=>e.position-t.position).map(e=>e.path)},Xe=async(e,t)=>{let n=t.cookiesForUrl(e),[,r]=await Application.scheduleRequest({url:e,method:`GET`}),i=Application.arrayBufferToUTF8String(r),a=await Application.executeInWebView({source:{html:i,baseUrl:e,loadCSS:!1,loadImages:!0,userAgent:D},inject:`
  return new Promise(function (resolve) {
    var lastCount = -1;
    var stableTicks = 0;
    var attempts = 0;

    function collect() {
      var nodes = Array.prototype.slice.call(
        document.querySelectorAll('div.grid img.w-full.object-cover'),
      );
      if (nodes.length === 0) {
        nodes = Array.prototype.slice.call(document.querySelectorAll('img')).filter(function (img) {
          var src = img.getAttribute('src') || img.currentSrc || img.src || '';
          return src.indexOf('cdn.scans.gg') > -1 || src.indexOf('/pages/') > -1;
        });
      }

      var urls = nodes
        .map(function (img) {
          return img.getAttribute('src') || img.currentSrc || img.src || '';
        })
        .filter(function (src) {
          return src.length > 0 && src.indexOf('data:') !== 0;
        });

      if (urls.length > 0 && urls.length === lastCount) {
        stableTicks++;
      } else {
        stableTicks = 0;
      }
      lastCount = urls.length;

      if ((urls.length > 0 && stableTicks >= 2) || attempts++ > 50) {
        resolve(JSON.stringify(urls));
        return;
      }
      setTimeout(collect, 500);
    }

    collect();
  });
`,storage:{cookies:n}});if(typeof a.result!=`string`||a.result.length===0)return[];try{let e=JSON.parse(a.result);return Array.isArray(e)?e.filter(e=>typeof e==`string`&&e.length>0):[]}catch{return[]}};return e.ScansGG=new class{constructor(){i(this,`globalRateLimiter`,new le(`rateLimiter`,{numberOfRequests:5,bufferInterval:2,ignoreImages:!0})),i(this,`cookieStorageInterceptor`,new ue({storage:`stateManager`})),i(this,`scansGGInterceptor`,new Ee(`main`))}async initialise(){this.globalRateLimiter.registerInterceptor(),this.cookieStorageInterceptor.registerInterceptor(),this.scansGGInterceptor.registerInterceptor()}async getSettingsForm(){return new we}async cloudflareBypassCompleted(e,t,n){for(let e of t)(e.name.startsWith(`cf`)||e.name.startsWith(`_cf`)||e.name.startsWith(`__cf`))&&this.cookieStorageInterceptor.setCookie(e)}async getDiscoverSections(){return[{id:w.POPULAR,title:`Top Manga`,type:S.featured},{id:w.POPULAR_RANGES,title:`Most Popular`,type:S.genres},{id:w.LATEST,title:`Latest Updates`,type:S.chapterUpdates},{id:w.ALL_SERIES,title:`All Series`,type:S.simpleCarousel},{id:w.GENRES,title:`Genres`,type:S.genres}]}async getDiscoverSectionItems(e,t){let n=H();if(e.id===w.GENRES)return{items:j.filter(e=>De(e.id,n)).map(e=>({type:`genresCarouselItem`,name:e.value,searchQuery:{title:``,metadata:{tags:{[e.id]:`included`},tagMatchMode:`and`}},metadata:void 0})),metadata:void 0};if(e.id===w.POPULAR_RANGES)return{items:me.filter(e=>e.id!==`monthly`).map(e=>({type:`genresCarouselItem`,name:e.value,searchQuery:{title:``,metadata:{popularRange:e.id}},metadata:void 0})),metadata:void 0};if(e.id===w.POPULAR)return{items:(await this.fetchPopularSeries(`monthly`,void 0,n)).map(Ve).filter(K),metadata:void 0};if(e.id===w.LATEST){let e=await this.fetchFilteredLatestSeries(t,e=>!!e.cover&&G(e,void 0,n)&&e.chapters?.[0]?.id!=null);return{items:e.data.map(Ue).filter(K).filter(e=>e.type===`chapterUpdatesCarouselItem`),metadata:e.metadata}}if(e.id!==w.ALL_SERIES)throw Error(`Unknown discover section: ${e.id}`);let r=await this.fetchFilteredSeries(t,{},e=>!!e.cover&&G(e,void 0,n));return{items:r.data.map(He).filter(K),metadata:r.metadata}}async getAdvancedSearchForm(e){return new be(e)}async getSearchResults(e,t,n){let r=(e.title??``).trim(),i=await this.resolveDirectQuery(r);if(i)return i;let a=e.metadata,o=U(a?.types,`included`),s=U(a?.statuses,`included`),c=U(a?.tags,`included`),l=H();if(a?.popularRange&&r.length===0)return{items:(await this.fetchPopularSeries(a.popularRange,a,l)).map($).filter(e=>e.imageUrl.length>0),metadata:void 0};let u=await this.fetchFilteredSeries(t,{q:r.length>0?r:void 0,q_type:o.length>0?o:void 0,q_status:s.length>0?s:void 0,q_tags:c.length===1?c:void 0},e=>!!e.cover&&G(e,a,l));return{items:u.data.map($).filter(e=>e.imageUrl.length>0),metadata:u.metadata}}async fetchFilteredSeries(e,t,n){let r=[],i=e?.offset??0,a=e?.index??0;for(let e=0;e<10;e++){let e=(await V(`series`,{limit:21,offset:i,...t})).data??[];for(;a<e.length&&r.length<21;){let t=e[a];a++,t&&n(t)&&r.push(t)}if(r.length===21)return a<e.length?{data:r,metadata:{offset:i,index:a}}:{data:r,metadata:e.length===21?{offset:i+e.length,index:0}:void 0};if(e.length<21)return{data:r,metadata:void 0};i+=e.length,a=0}return{data:r,metadata:{offset:i,index:a}}}async fetchPopularSeries(e,t,n){return((await V(`series`,{popular:e,limit:50,chapters:!0,group_details:!0,collab_groups_details:!0})).data??[]).filter(e=>!!e.cover&&G(e,t,n)).slice(0,21)}async fetchFilteredLatestSeries(e,t){let n=[],r=e?.page??1,i=e?.index??0;for(let e=0;e<10;e++){let e=await V(`chapters`,{page:r,limit:14,chapters:!0,series_details:!0,group_details:!0,collab_groups_details:!0,sort:`date`}),a=e.data??[],o=e.meta?.has_more===!0||a.length===14;for(;i<a.length&&n.length<14;){let e=a[i];i++,e&&t(e)&&n.push(e)}if(n.length===14)return i<a.length?{data:n,metadata:{page:r,index:i}}:{data:n,metadata:o?{page:r+1,index:0}:void 0};if(!o)return{data:n,metadata:void 0};r++,i=0}return{data:n,metadata:{page:r,index:i}}}async resolveDirectQuery(e){let t,n=e.match(/^https?:\/\/[^/]*scans\.gg\/series\/(\d[^/?#]*)/i);if(n)try{t=decodeURIComponent(n[1])}catch{return}else/^id:\d+$/i.test(e)&&(t=e.slice(3).trim());if(t)try{let e=await V(`series`,{id:t,trackers:!0,sources:!0});if(!e.data)return;if(!G(e.data,void 0,H()))return{items:[],metadata:void 0};let n=$(e.data);return{items:n.imageUrl.length>0?[n]:[],metadata:void 0}}catch(e){if(e instanceof g)throw e;return}}async getMangaDetails(e){let t=await V(`series`,{id:e,trackers:!0,sources:!0});if(!t.data)throw Error(`No series data returned for id ${e}.`);return We(t.data)}async getChapters(e){let t=[],n=1,r=!0;for(;r&&n<=200;){let i=await V(`chapters`,{series_id:J(e.mangaId),limit:100,page:n,group_details:!0}),a=i.data??[];t.push(...a),r=i.meta?.has_more===!0&&a.length>0,n++}return qe(t,e,J(e.mangaId))}async processTitlesForUpdates(e){let[t]=e.getQueuedItems();if(t)try{await V(`chapters`,{series_id:J(t.mangaId),limit:100,page:1,group_details:!0})}catch(e){if(e instanceof g)throw e}}async getChapterDetails(e){let{seriesId:t,chapterId:n,groupId:r}=je(e.chapterId),i=t=>({id:e.chapterId,mangaId:e.sourceManga.mangaId,pages:t}),a=[this.pagesViaApi(t,n,r),this.pagesViaReaderHtml(t,n,r)];r!==`0`&&a.push(this.pagesViaApi(t,n,`0`));try{return i(await Promise.any(a))}catch(e){if(e instanceof g)throw e;if(e instanceof AggregateError){let t=e.errors.find(e=>e instanceof g);if(t)throw t}}try{return i(await this.pagesViaApi(t,n,r))}catch(e){if(e instanceof g)throw e}let o=await Xe(this.readerUrl(t,n,r),this.cookieStorageInterceptor);if(o.length===0)throw Error(`No page data returned for chapter ${e.chapterId}.`);return i(o)}readerUrl(e,t,n){let r=n===`0`?``:`?group=${n}`;return`${I()}/series/${e}/${t}${r}`}async pagesViaApi(e,t,n){let r={series_id:e,chapter_id:t};n!==`0`&&(r.group_id=n);let i=await V(`chapter-navigation`,r);if(!i.data)throw Error(`No page data returned for chapter ${t}.`);return Je(i.data,t)}async pagesViaReaderHtml(e,t,n){let r=this.readerUrl(e,t,n),[i,a]=await Application.scheduleRequest({url:r,method:`GET`});if(i.status!==200)throw Error(`Reader page failed with status ${i.status}.`);let o=Ye(Application.arrayBufferToUTF8String(a));if(o.length===0)throw Error(`No pages found in the reader payload for ${t}.`);return o.map(e=>`${C}/pages/${t}/${e}`)}},e})({});
    return typeof source !== "undefined" ? source : {};
  };

  const __sourceModule = __executeUpstream.call(Object.create(__realG), Application);

  // Extract the scraper extension instance
  let __ext = null;
  for (const k of Object.keys(__sourceModule)) {
    const candidate = __sourceModule[k];
    if (candidate && typeof candidate.getChapters === "function") {
      __ext = candidate;
      break;
    }
  }

  if (!__ext) {
    harbor.log("Failed to locate Paperback Extension instance in module:", Object.keys(__sourceModule));
  }

  // 4. Harbor MangaProvider Adapter
  const plugin = {
    id: "scansgg",
    name: "Scans.GG",

    preferences: [
      {
        key: "mirrorUrl",
        label: "Mirror Domain",
        type: "text",
        default: "",
      },
      {
        key: "imageQuality",
        label: "Image Quality",
        type: "select",
        options: ["high", "medium", "low"],
        default: "high",
      },
      {
        key: "dataSaver",
        label: "Data Saver Mode",
        type: "checkbox",
        default: false,
      },
    ],

    async popular(offset, tagOrFilters) {
      if (__ext) {
        if (__ext.initialise && !this.__initDone) {
          try { await __ext.initialise(); } catch (_) {}
          this.__initDone = true;
        }

        if (!tagOrFilters) {
          const page = Math.floor(Math.max(0, offset) / 48) + 1;
          try {
            if (typeof __ext.getDiscoverSections === "function") {
              const sections = await __ext.getDiscoverSections();
              if (Array.isArray(sections) && sections.length > 0) {
                const targetSec =
                  sections.find((s) => ["hot", "recommended", "popular", "featured"].includes(String(s.id).toLowerCase())) ||
                  sections[0];
                const res = await __ext.getDiscoverSectionItems(targetSec, { page });
                const items = res?.items || (Array.isArray(res) ? res : []);
                if (items.length > 0) {
                  return items.map(__mapItem).filter(Boolean);
                }
              }
            }
          } catch (e) {
            harbor.log("getDiscoverSections error:", e);
          }
        }
      }
      return this.search("", offset, tagOrFilters);
    },

    async search(query, offset, tagOrFilters) {
      if (!__ext) return [];
      if (__ext.initialise && !this.__initDone) {
        try { await __ext.initialise(); } catch (_) {}
        this.__initDone = true;
      }

      const page = Math.floor(Math.max(0, offset) / 48) + 1;

      // 1. Resolve Sorting Options
      let sortOpts = [];
      let sortOption = { id: "default", label: "Default" };
      try {
        if (typeof __ext.getSortingOptions === "function") {
          sortOpts = (await __ext.getSortingOptions()) || [];
          if (Array.isArray(sortOpts) && sortOpts.length > 0) {
            sortOption = sortOpts[0];
          }
        }
      } catch (_) {}

      // 2. Resolve selected sort and metadata from tagOrFilters
      let metadata = undefined;
      if (typeof tagOrFilters === "string" && tagOrFilters) {
        if (tagOrFilters.startsWith("sort:")) {
          const sortId = tagOrFilters.slice(5);
          const matchedSort = sortOpts.find((s) => s.id === sortId || s.label === sortId || String(s.id).toLowerCase() === sortId.toLowerCase());
          if (matchedSort) sortOption = matchedSort;
        } else {
          const cleanTag = tagOrFilters.startsWith("genre:") ? tagOrFilters.slice(6) : tagOrFilters;
          if (typeof __ext.getSearchFilters === "function") {
            metadata = [{ id: "tags", value: { [cleanTag]: "included" } }];
          } else {
            metadata = {
              genres: [cleanTag],
              categories: { [cleanTag]: "included" },
              includedTags: [cleanTag],
              seriesStatuses: [cleanTag],
            };
          }
        }
      } else if (Array.isArray(tagOrFilters)) {
        // Structured PluginFilterGroup[]
        for (const group of tagOrFilters) {
          if (group.id === "sort" || group.name?.toLowerCase().includes("sort")) {
            const sortFilter = group.filters?.find((f) => f.type === "sort");
            if (sortFilter && sortFilter.selectedIndex != null && sortFilter.values) {
              const selectedVal = sortFilter.values[sortFilter.selectedIndex];
              const matchedSort = sortOpts.find((s) => s.label === selectedVal || s.id === selectedVal || String(s.id).toLowerCase() === String(selectedVal).toLowerCase());
              if (matchedSort) sortOption = matchedSort;
            }
          }
        }

        if (typeof __ext.getSearchFilters === "function") {
          const filterArr = [];
          for (const group of tagOrFilters) {
            if (group.id === "sort") continue;
            const groupVal = {};
            for (const f of group.filters || []) {
              if (f.type === "tri-state" && f.state && f.state !== "ignore") {
                groupVal[f.id] = f.state === "include" ? "included" : "excluded";
              } else if (f.type === "checkbox" && f.checked) {
                groupVal[f.id] = true;
              } else if (f.type === "select" && f.selectedIndex != null && f.values) {
                groupVal[f.id] = f.values[f.selectedIndex];
              }
            }
            if (Object.keys(groupVal).length > 0) {
              filterArr.push({ id: group.id, value: groupVal });
            }
          }
          if (filterArr.length > 0) metadata = filterArr;
        } else {
          const genres = [];
          const categories = {};
          for (const group of tagOrFilters) {
            if (group.id === "sort") continue;
            for (const f of group.filters || []) {
              if (f.type === "tri-state" && f.state && f.state !== "ignore") {
                if (f.state === "include") {
                  genres.push(f.id);
                  categories[f.id] = "included";
                } else if (f.state === "exclude") {
                  categories[f.id] = "excluded";
                }
              } else if (f.type === "checkbox" && f.checked) {
                genres.push(f.id);
              }
            }
          }
          if (genres.length > 0 || Object.keys(categories).length > 0) {
            metadata = { genres, categories, includedTags: genres };
          }
        }
      }

      const searchParams = { title: query || "", metadata };
      const res = await __ext.getSearchResults(searchParams, { offset, page }, sortOption);
      const items = res?.items || (Array.isArray(res) ? res : []);
      return items.map(__mapItem).filter(Boolean);
    },

    async detail(id) {
      if (!__ext) return null;
      if (__ext.initialise && !this.__initDone) {
        try { await __ext.initialise(); } catch (_) {}
        this.__initDone = true;
      }

      const res = await __ext.getMangaDetails(id);
      if (!res) return null;
      __mangaCache.set(id, res);
      const info = res.mangaInfo || res;
      const primaryTitle = info.primaryTitle || info.title || id;
      const altTitles = info.secondaryTitles || (info.altTitle ? [info.altTitle] : []);

      return {
        id,
        title: __cleanTitle(primaryTitle),
        altTitle: altTitles[0] || undefined,
        cover: __absUrl(info.thumbnailUrl || info.imageUrl || info.cover),
        description: info.synopsis || info.description || undefined,
        status: info.status || undefined,
        author: info.author || undefined,
        contentRating: info.contentRating || undefined,
      };
    },

    async chapters(id) {
      if (!__ext) return [];
      if (__ext.initialise && !this.__initDone) {
        try { await __ext.initialise(); } catch (_) {}
        this.__initDone = true;
      }

      const __cached = __mangaCache.get(id);
      let __smUsed = __cached ? Object.assign({ mangaId: id }, __cached) : { mangaId: id };
      let res;
      try {
        res = await __ext.getChapters(__smUsed);
      } catch (e) {
        if (__cached) throw e;
        const det = await __ext.getMangaDetails(id);
        if (!det) throw e;
        __mangaCache.set(id, det);
        __smUsed = Object.assign({ mangaId: id }, det);
        res = await __ext.getChapters(__smUsed);
      }
      const list = Array.isArray(res) ? res : (res?.chapters || []);
      return list
        .map((c, index) => {
          const chapterId = c.chapterId || c.id || String(index);
          const compositeId = `${id}::${chapterId}`;
          __chapterCache.set(compositeId, { raw: c, sm: __smUsed });
          return {
            id: compositeId,
            chapter: c.chapNum != null ? String(c.chapNum) : (c.chapter != null ? String(c.chapter) : null),
            title: c.title || undefined,
            volume: c.volume != null ? String(c.volume) : null,
            pages: 0,
            language: c.langCode || "en",
            group: c.group || c.version || undefined,
            publishAt: c.publishDate ? new Date(c.publishDate).toISOString() : undefined,
          };
        })
        .filter((c) => Boolean(c.id));
    },

    async pageUrls(compositeId) {
      if (!__ext) return [];
      if (__ext.initialise && !this.__initDone) {
        try { await __ext.initialise(); } catch (_) {}
        this.__initDone = true;
      }

      let mangaId = "";
      let chapterId = compositeId;
      if (compositeId.includes("::")) {
        const parts = compositeId.split("::");
        mangaId = parts[0];
        chapterId = parts.slice(1).join("::");
      }

      const __cc = __chapterCache.get(compositeId);
      const __sm = (__cc && __cc.sm) || (__mangaCache.get(mangaId) ? Object.assign({ mangaId }, __mangaCache.get(mangaId)) : { mangaId });
      const __chapterArg = Object.assign({}, __cc ? __cc.raw : {}, { sourceManga: __sm, chapterId });

      let res;
      try {
        res = await __ext.getChapterDetails(__chapterArg);
      } catch (e) {
        if (__cc) throw e;
        const det = __mangaCache.get(mangaId) || (await __ext.getMangaDetails(mangaId));
        if (!det) throw e;
        __mangaCache.set(mangaId, det);
        const sm2 = Object.assign({ mangaId }, det);
        const chs = await __ext.getChapters(sm2);
        const arr = Array.isArray(chs) ? chs : ((chs && chs.chapters) || []);
        const found = arr.find((x) => String(x.chapterId || x.id) === chapterId);
        res = await __ext.getChapterDetails(Object.assign({}, found || {}, { sourceManga: sm2, chapterId }));
      }

      const pages = res?.pages || res?.images || res?.imageUrls || (Array.isArray(res) ? res : []);
      return pages.map(__absUrl).filter(Boolean);
    },

    async getFilters() {
      if (!__ext) return [];
      if (__ext.initialise && !this.__initDone) {
        try { await __ext.initialise(); } catch (_) {}
        this.__initDone = true;
      }

      const groups = [];

      // 1. Sorting options group
      if (typeof __ext.getSortingOptions === "function") {
        try {
          const sortOpts = await __ext.getSortingOptions();
          if (Array.isArray(sortOpts) && sortOpts.length > 0) {
            groups.push({
              id: "sort",
              name: "Sort By",
              filters: [
                {
                  type: "sort",
                  id: "order",
                  name: "Order",
                  values: sortOpts.map((s) => s.label || s.id),
                  selectedIndex: 0,
                  ascending: false,
                },
              ],
            });
          }
        } catch (_) {}
      }

      // 2. Search tags / filters groups
      if (typeof __ext.getSearchTags === "function") {
        try {
          const tagGroups = await __ext.getSearchTags();
          if (Array.isArray(tagGroups)) {
            for (const tg of tagGroups) {
              if (tg.tags && tg.tags.length > 0) {
                groups.push({
                  id: tg.id || "tags",
                  name: tg.title || tg.id || "Tags",
                  filters: tg.tags.map((t) => ({
                    type: "tri-state",
                    id: t.id,
                    name: t.title || t.id,
                    state: "ignore",
                  })),
                });
              }
            }
          }
        } catch (_) {}
      } else if (typeof __ext.getSearchFilters === "function") {
        try {
          const filters = await __ext.getSearchFilters();
          if (Array.isArray(filters)) {
            for (const f of filters) {
              if (f.options && Array.isArray(f.options) && f.options.length > 0) {
                groups.push({
                  id: f.id,
                  name: f.title || f.id,
                  filters: f.options.map((o) => ({
                    type: "tri-state",
                    id: o.id,
                    name: o.title || o.id,
                    state: "ignore",
                  })),
                });
              }
            }
          }
        } catch (_) {}
      }

      return groups;
    },

    async tags() {
      const filters = await this.getFilters();
      const tagList = [];

      for (const group of filters) {
        if (group.id === "sort") {
          const sortFilter = group.filters?.find((f) => f.type === "sort");
          if (sortFilter && sortFilter.values) {
            for (const val of sortFilter.values) {
              tagList.push({ id: "sort:" + val, name: val, group: "Sort" });
            }
          }
        } else {
          for (const f of group.filters || []) {
            tagList.push({ id: "genre:" + f.id, name: f.name, group: group.name });
          }
        }
      }

      // Fallback to legacy getGenres if available and empty
      if (tagList.length === 0 && __ext && typeof __ext.getGenres === "function") {
        try {
          const genres = await __ext.getGenres();
          if (Array.isArray(genres)) {
            return genres
              .map((g) => ({
                id: g.id || g.title,
                name: g.title || g.id,
                group: "Genre",
              }))
              .filter((t) => t.id && t.name);
          }
        } catch (_) {}
      }

      return tagList;
    },
  };

  // Register with Harbor
  if (typeof harbor !== "undefined" && harbor.register) {
    try {
      harbor.register(plugin);
    } catch (_) {}
  }
})();

} catch (__e) {
(function () {
  var t = { TextDecoder: typeof TextDecoder, TextEncoder: typeof TextEncoder, URL: typeof URL, URLSearchParams: typeof URLSearchParams, structuredClone: typeof structuredClone, Intl: typeof Intl, atob: typeof atob, btoa: typeof btoa, setTimeout: typeof setTimeout, AbortController: typeof AbortController, Headers: typeof Headers, Blob: typeof Blob, FormData: typeof FormData, Proxy: typeof Proxy, Reflect: typeof Reflect, WeakRef: typeof WeakRef, queueMicrotask: typeof queueMicrotask, globalThis: typeof globalThis, crypto: typeof crypto, window: typeof window, document: typeof document, self: typeof self };
  var miss = [];
  for (var k in t) { if (t[k] === "undefined") miss.push(k); }
  var m = (__e && __e.message) ? __e.message : String(__e);
  var st = (__e && __e.stack) ? String(__e.stack).split("\n").slice(0, 2).join(" / ") : "";
  var msg = "LOAD ERR: " + m + (st ? " | " + st : "") + " | missing: " + (miss.length ? miss.join(",") : "none");
  var rows = function () { var out = []; for (var i = 0; i < msg.length && out.length < 12; i += 34) out.push({ id: "debug-" + out.length, title: msg.slice(i, i + 34) }); return out; };
  harbor.register({ id: "scansgg", name: "Scans.GG", popular: async function () { return rows(); }, search: async function () { return rows(); }, detail: async function (id) { return { id: id, title: msg.slice(0, 120), description: msg }; }, chapters: async function () { return []; }, pageUrls: async function () { return []; } });
})();
}
