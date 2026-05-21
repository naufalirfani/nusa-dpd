// Apply user preferences early to avoid FOUC.
// Default to light mode unless localStorage explicitly sets theme === 'dark'.
(function(){
  try{
    var l = localStorage.getItem('locale') || 'id';
    document.documentElement.lang = l;
    var dark = localStorage.getItem('theme');
    if(dark === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }catch(e){/* ignore */}
})();
