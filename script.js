function showsection(sectionid) {
    const sections = document.querySelectorAll('section');
    sections.forEach(sec => sec.style.display = 'none');
    document.getElementById(sectionid).style.display = 'block';
}