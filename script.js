// --- FIREBASE INITIALIZATION ---
const firebaseConfig = {
    apiKey: "AIzaSyBTRwFyTODsIj5kPm6Tw0ppdHrBBvYP0a4",
    authDomain: "shop-c8a3f.firebaseapp.com",
    databaseURL: "https://shop-c8a3f-default-rtdb.firebaseio.com",
    projectId: "shop-c8a3f",
    storageBucket: "shop-c8a3f.firebasestorage.app",
    messagingSenderId: "149137567998",
    appId: "1:149137567998:web:849cb2e56ecd754941b5af",
    measurementId: "G-YX0ZHXW6F5"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

// --- GLOBAL DATA ---
let products = JSON.parse(localStorage.getItem('sbjr_products')) || [];

// --- AUTH FLOW ---
document.getElementById('google-login-btn').onclick = () => {
    auth.signInWithPopup(provider).then((result) => {
        const user = result.user;
        const data = { name: user.displayName, email: user.email, photo: user.photoURL };
        localStorage.setItem('sbjr_user', JSON.stringify(data));
        location.reload();
    }).catch(err => alert("Login Failed: " + err.message));
};

// --- NAVIGATION ENGINE (GLOBAL SCOPE) ---
window.switchView = function(id) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.add('d-none'));
    const target = document.getElementById(id);
    if(target) target.classList.remove('d-none');

    // Section specific renders
    if(id === 'dashboard-view') renderDashboard();
    if(id === 'inventory-view') renderInventory();
    if(id === 'profile-view') populateProfile();
};

function setupNavigation() {
    const sidebar = document.getElementById('mobile-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    
    document.querySelectorAll('.nav-item').forEach(link => {
        link.onclick = (e) => {
            const target = link.getAttribute('data-target');
            if(target) {
                document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                link.classList.add('active');
                
                const titles = { 
                    'dashboard-view': 'Overview', 
                    'inventory-view': 'Products List', 
                    'add-product-view': 'Manage Stock', 
                    'settings-view': 'Settings', 
                    'profile-view': 'Admin ID' 
                };
                document.getElementById('page-title').innerText = titles[target];

                if(target === 'add-product-view') resetAddForm();

                window.switchView(target);
                sidebar.classList.remove('active');
                overlay.style.display = 'none';
            }
        };
    });

    document.getElementById('open-sidebar').onclick = () => { sidebar.classList.add('active'); overlay.style.display = 'block'; };
    document.getElementById('close-sidebar').onclick = () => { sidebar.classList.remove('active'); overlay.style.display = 'none'; };
    overlay.onclick = () => { sidebar.classList.remove('active'); overlay.style.display = 'none'; };
}

// --- EDIT & DELETE LOGIC (DEBUGGED - GLOBAL SCOPE) ---
window.editProduct = function(id) {
    const p = products.find(prod => prod.id == id);
    if(p) {
        // Fill form
        document.getElementById('edit-id').value = p.id;
        document.getElementById('prod-name').value = p.name;
        document.getElementById('prod-category').value = p.category;
        document.getElementById('prod-brand').value = p.brand;
        document.getElementById('prod-price').value = p.price;
        document.getElementById('prod-qty').value = p.qty;
        
        // UI Change
        document.getElementById('form-title').innerText = "Edit Product: " + p.name;
        document.getElementById('submit-btn').innerText = "Update Changes";
        document.getElementById('cancel-edit').classList.remove('d-none');

        // Navigate
        window.switchView('add-product-view');
        // Update Nav Highlight
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        document.querySelector('[data-target="add-product-view"]').classList.add('active');
    }
};

window.deleteProduct = function(id) {
    if(confirm("Confirm Deletion? This cannot be undone.")) {
        products = products.filter(p => p.id != id);
        localStorage.setItem('sbjr_products', JSON.stringify(products));
        renderInventory();
        renderDashboard();
        showToast("Product removed successfully.");
    }
};

function resetAddForm() {
    document.getElementById('product-form').reset();
    document.getElementById('edit-id').value = '';
    document.getElementById('form-title').innerText = "New Stock Entry";
    document.getElementById('submit-btn').innerText = "Save To Database";
    document.getElementById('cancel-edit').classList.add('d-none');
}

// --- CRUD HANDLER ---
document.getElementById('product-form').onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submit-btn');
    const editId = document.getElementById('edit-id').value;
    const imageFile = document.getElementById('prod-image').files[0];
    
    btn.disabled = true;
    btn.innerText = "Processing...";

    const toBase64 = file => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });

    let imgData = "";
    if (imageFile) {
        imgData = await toBase64(imageFile);
    } else if (editId) {
        const oldP = products.find(p => p.id == editId);
        imgData = oldP ? oldP.image : "";
    }

    const item = {
        id: editId ? parseInt(editId) : Date.now(),
        name: document.getElementById('prod-name').value,
        brand: document.getElementById('prod-brand').value,
        category: document.getElementById('prod-category').value,
        price: parseFloat(document.getElementById('prod-price').value),
        qty: parseInt(document.getElementById('prod-qty').value),
        image: imgData
    };

    if(editId) {
        const idx = products.findIndex(p => p.id == editId);
        if(idx !== -1) products[idx] = item;
    } else {
        products.push(item);
    }

    localStorage.setItem('sbjr_products', JSON.stringify(products));

    // SUCCESS FEEDBACK
    const overlay = document.getElementById('success-overlay');
    overlay.classList.remove('d-none');

    setTimeout(() => {
        overlay.classList.add('d-none');
        resetAddForm();
        btn.disabled = false;
        btn.innerText = "Save To Database";
        window.switchView('inventory-view');
        // Update nav UI
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        document.querySelector('[data-target="inventory-view"]').classList.add('active');
        document.getElementById('page-title').innerText = "Products List";
    }, 1200);
};

// --- RENDERERS ---
function renderDashboard() {
    const totalVal = products.reduce((acc, p) => acc + (p.price * p.qty), 0);
    const lowStock = products.filter(p => p.qty < 5).length;
    
    document.getElementById('stat-total-products').innerText = products.length;
    document.getElementById('stat-total-value').innerText = `₹${(totalVal/1000).toFixed(1)}k`;
    document.getElementById('stat-low-stock').innerText = lowStock;

    const table = document.getElementById('dashboard-recent-table');
    table.innerHTML = products.length ? products.slice(-5).reverse().map(p => `
        <tr>
            <td class="ps-4 fw-bold text-dark">${p.name}</td>
            <td class="text-muted small">${p.brand}</td>
            <td><span class="badge ${p.qty<5?'bg-danger':'bg-success-subtle text-success'} rounded-pill">${p.qty} Units</span></td>
            <td class="fw-bold text-indigo">₹${p.price}</td>
        </tr>
    `).join('') : '<tr><td colspan="4" class="text-center py-4 text-muted">No Data Found</td></tr>';
}

function renderInventory() {
    const search = document.getElementById('inventory-search').value.toLowerCase();
    const filter = document.getElementById('category-filter').value;
    const grid = document.getElementById('product-grid');

    const filtered = products.filter(p => 
        (filter === 'All' || p.category === filter) && 
        (p.name.toLowerCase().includes(search) || p.brand.toLowerCase().includes(search))
    );

    grid.innerHTML = filtered.map(p => `
        <div class="col-6 col-md-4 col-lg-3">
            <div class="card border-0 shadow-sm h-100 p-3 rounded-4">
                <div class="prod-img-box">
                    ${p.image ? `<img src="${p.image}">` : `<i class="fas fa-seedling text-muted opacity-25"></i>`}
                </div>
                <div class="d-flex justify-content-between mb-2">
                    <span class="badge bg-light text-dark rounded-pill" style="font-size:10px">${p.category}</span>
                    <div class="dropdown">
                         <button class="btn btn-sm p-0 text-muted" data-bs-toggle="dropdown" aria-expanded="false">
                            <i class="fas fa-ellipsis-v"></i>
                         </button>
                         <ul class="dropdown-menu border-0 shadow-lg rounded-3">
                            <li><button class="dropdown-item py-2" onclick="editProduct(${p.id})"><i class="fas fa-edit me-2 text-primary"></i> Edit</button></li>
                            <li><button class="dropdown-item py-2 text-danger" onclick="deleteProduct(${p.id})"><i class="fas fa-trash me-2"></i> Delete</button></li>
                         </ul>
                    </div>
                </div>
                <h6 class="fw-bold mb-1 text-truncate">${p.name}</h6>
                <p class="text-xs text-muted mb-3">${p.brand}</p>
                <div class="mt-auto d-flex justify-content-between align-items-center">
                    <span class="fw-bold text-indigo">₹${p.price}</span>
                    <span class="text-xs fw-bold ${p.qty<5?'text-danger':'text-success'}">Qty: ${p.qty}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// --- INITIALIZATION ---
function populateProfile() {
    const user = JSON.parse(localStorage.getItem('sbjr_user'));
    if(!user) return;
    document.getElementById('profile-img-large').src = user.photo;
    document.getElementById('profile-name-large').innerText = user.name;
    document.getElementById('profile-email-large').innerText = user.email;
    document.getElementById('last-login-time').innerText = new Date().toLocaleTimeString();
}

function initApp() {
    const user = JSON.parse(localStorage.getItem('sbjr_user'));
    if (user) {
        document.getElementById('login-section').classList.add('d-none');
        document.getElementById('main-layout').classList.remove('d-none');
        document.getElementById('nav-user-name').innerText = user.name;
        document.getElementById('nav-user-img').src = user.photo;
        
        const dateOpt = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById('live-date').innerText = new Date().toLocaleDateString('en-US', dateOpt);

        setupNavigation();
        renderDashboard();
    }
}

document.querySelectorAll('.logout-btn').forEach(b => b.onclick = () => {
    auth.signOut().then(() => { localStorage.removeItem('sbjr_user'); location.reload(); });
});

window.onload = initApp;
document.getElementById('inventory-search').oninput = renderInventory;
document.getElementById('category-filter').onchange = renderInventory;
document.getElementById('cancel-edit').onclick = resetAddForm;

function showToast(msg) {
    document.getElementById('toast-msg').innerText = msg;
    new bootstrap.Toast(document.getElementById('liveToast')).show();
                      }
