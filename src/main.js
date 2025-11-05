// Import base.css before main.css so any @import rules (fonts etc.) are included
// and PostCSS/Tailwind directives in main.css remain at the top of the processed file.
import "./assets/base.css";
import "./assets/main.css";

import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";

// import SweetAlert2 from npm and expose as global `Swal` for existing code
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
try {
  window.Swal = Swal;
} catch (e) {
  // ignore if window is not available in the environment
}

createApp(App).use(router).mount("#app");
