document.addEventListener('DOMContentLoaded', () => {
  const menuToggle = document.querySelector('.menu-toggle');
  
  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      // Здесь можно добавить логику открытия меню
      console.log('Menu clicked');
    });
  }
});
