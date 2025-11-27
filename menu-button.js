// Add hamburger menu button to open sidebar - React-compatible version
(function () {
    function addMenuButton() {
        const mapContainer = document.querySelector('.map-container');

        // If map container doesn't exist yet, try again in a moment
        if (!mapContainer) {
            setTimeout(addMenuButton, 100);
            return;
        }

        // Check if button already exists
        if (document.querySelector('.menu-toggle-btn')) {
            return;
        }

        // Create menu button
        const menuBtn = document.createElement('button');
        menuBtn.className = 'menu-toggle-btn';
        menuBtn.innerHTML = `
            <span style="width: 24px; height: 2px; background: currentColor; border-radius: 2px; display: block;"></span>
            <span style="width: 24px; height: 2px; background: currentColor; border-radius: 2px; display: block; margin-top: 4px;"></span>
            <span style="width: 24px; height: 2px; background: currentColor; border-radius: 2px; display: block; margin-top: 4px;"></span>
        `;

        // Style the button
        Object.assign(menuBtn.style, {
            position: 'absolute',
            top: '1rem',
            left: '1rem',
            zIndex: '1001',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            color: 'var(--text-main)',
            width: '48px',
            height: '48px',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
            transition: 'all 0.2s'
        });

        // Add hover effect
        menuBtn.addEventListener('mouseenter', () => {
            menuBtn.style.background = 'var(--accent)';
            menuBtn.style.borderColor = 'var(--accent)';
        });

        menuBtn.addEventListener('mouseleave', () => {
            menuBtn.style.background = 'var(--bg-card)';
            menuBtn.style.borderColor = 'var(--border)';
        });

        // Add click handler to open sidebar
        menuBtn.addEventListener('click', () => {
            const sidebarWrapper = document.querySelector('.sidebar-wrapper');
            if (sidebarWrapper) {
                sidebarWrapper.classList.add('active');
            }
        });

        menuBtn.title = 'Open menu';

        // Add button to map container
        mapContainer.appendChild(menuBtn);
    }

    // Start trying to add the button
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addMenuButton);
    } else {
        addMenuButton();
    }
})();
