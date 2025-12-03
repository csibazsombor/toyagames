        // Real Resource Loader
        class ResourceLoader {
            constructor() {
                this.resources = [
                    { url: 'CSS/style.css', type: 'css' },
                    { url: 'CSS/fonts.css', type: 'css' },
                    { url: 'https://csibazsombor.github.io/csibazsombor/CSS/tel.css', type: 'css' },
                    { url: 'Screenshots/Screenshot_2.png', type: 'image' },
                    { url: 'Games/CIKOIN/JS/auto-optimize.js', type: 'script' },
                    { url: 'https://csibazsombor.github.io/csibazsombor/JS/snow.js', type: 'script' }
                ];
                this.loaded = 0;
                this.total = this.resources.length;
            }

            updateProgress(fileName) {
                this.loaded++;
                const percent = Math.round((this.loaded / this.total) * 100);
                
                document.getElementById('progressBar').style.width = percent + '%';
                document.getElementById('percentText').textContent = percent + '%';
                document.getElementById('currentFile').textContent = fileName || 'Loading...';
            }

            loadCSS(url) {
                return new Promise((resolve, reject) => {
                    const link = document.createElement('link');
                    link.rel = 'stylesheet';
                    link.href = url;
                    link.onload = () => resolve();
                    link.onerror = () => resolve(); // Continue even if fails
                    document.head.appendChild(link);
                });
            }

            loadScript(url) {
                return new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = url;
                    script.async = false;
                    script.onload = () => resolve();
                    script.onerror = () => resolve(); // Continue even if fails
                    document.body.appendChild(script);
                });
            }

            loadImage(url) {
                return new Promise((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => resolve();
                    img.onerror = () => resolve(); // Continue even if fails
                    img.src = url;
                });
            }

            async loadResource(resource) {
                const fileName = resource.url.split('/').pop();
                
                try {
                    switch(resource.type) {
                        case 'css':
                            await this.loadCSS(resource.url);
                            break;
                        case 'script':
                            await this.loadScript(resource.url);
                            break;
                        case 'image':
                            await this.loadImage(resource.url);
                            break;
                    }
                    
                    // Simulate minimum load time for UX
                    await new Promise(resolve => setTimeout(resolve, 200));
                    
                } catch (error) {
                    console.warn('Failed to load:', resource.url);
                }
                
                this.updateProgress(fileName);
            }

            async loadAll() {
                document.getElementById('currentFile').textContent = 'Starting...';
                
                // Small initial delay
                await new Promise(resolve => setTimeout(resolve, 300));
                
                // Load all resources sequentially
                for (const resource of this.resources) {
                    await this.loadResource(resource);
                }
                
                // Final polish
                await new Promise(resolve => setTimeout(resolve, 200));
                
                // Fade out loader
                document.getElementById('loader').classList.add('fade-out');
                document.getElementById('mainContent').classList.add('visible');
                
                // Remove loader after animation
                setTimeout(() => {
                    document.getElementById('loader').remove();
                }, 600);
            }
        }

        // Game Details Toggle
        function toggleDetails() {
            const details = document.getElementById('game-details');
            const toggleText = document.getElementById('details-toggle-text-cikoin');
            
            if (details.classList.contains('show')) {
                details.classList.remove('show');
                toggleText.textContent = '📋 Show Details';
            } else {
                details.classList.add('show');
                toggleText.textContent = '📋 Hide Details';
            }
        }

        // Wait for DOM to be ready, then start loading
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                const loader = new ResourceLoader();
                loader.loadAll();
            });
        } else {
            const loader = new ResourceLoader();
            loader.loadAll();
        }