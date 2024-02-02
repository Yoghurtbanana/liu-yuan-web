document.querySelectorAll('.zoomable-area').forEach(area => {
    area.addEventListener('click', function() {
        const id = this.dataset.id;
        const posX = this.getAttribute('x');
        const posY = this.getAttribute('y');

        const image = document.getElementById('tree-image');
        const container = document.getElementById('tree-container');
        // Adjust the origin of the transformation based on the rect position
        const transformOriginX = (parseFloat(posX) + parseFloat(this.getAttribute('width')) / 2) / 8.15;
        const transformOriginY = (parseFloat(posY) + parseFloat(this.getAttribute('height')) / 2) / 11.28;
        image.style.transformOrigin = `${transformOriginX}% ${transformOriginY}%`;
        image.style.transform = 'scale(3)';

        fetchDataForBranch(id);

        // Hide other elements on the page
        document.querySelectorAll('.hide-when-expand').forEach(el => {
            el.style.opacity = '0';
        });

        // Blur the tree
        image.classList.toggle('blur-effect');

        // Disable other zoom areas
        document.querySelectorAll('.zoomable-area').forEach(zoomArea => {
            zoomArea.style.pointerEvents = 'none';
        });
    });
});

function zoomOut() {
    const image = document.getElementById('tree-image');
    image.style.transform = 'scale(1)';
    image.classList.toggle('blur-effect');

    // Enable other zoom areas
    document.querySelectorAll('.zoomable-area').forEach(zoomArea => {
        zoomArea.style.pointerEvents = 'auto';
    });

    // Clear the query results
    document.getElementById('query-results').innerHTML = '';

    document.getElementById('go-back').style.display = 'none';
    document.getElementById('results-null').style.display = 'none';

    // Show other elements on the page
    document.querySelectorAll('.hide-when-expand').forEach(el => {
        el.style.opacity = '100%';
    });
}

// This function will fetch data from the server and update the page
function fetchDataForBranch(branchId) {
    const url = `/branch/${branchId}`;
    // Show the spinner
    document.getElementById('spinner').style.display = 'block';
    fetch(url)
        .then(response => response.json())
        .then(dataArray => {
            const resultsContainer = document.getElementById('query-results');
            resultsContainer.innerHTML = '';
            // Create a new element for each piece of data and append it to the results
            dataArray.forEach(data => {
                // Create a new element for each piece of data
                const resultElement = document.createElement('div');

                resultElement.className = 'leaf';
                resultElement.innerHTML = `
                    ${data.title}
                `;
                resultElement.onclick = function() {
                    showStory(data.image_path, data.title, data.content);
                };
                resultsContainer.appendChild(resultElement);
            });
            // Create & append the decoration element
            const resultsDecoration = document.createElement('div');
            resultsDecoration.id = "results-decoration";
            resultsContainer.appendChild(resultsDecoration);
            if (dataArray.length == 0) {
                document.getElementById('results-null').style.display = 'block';
            }
            // Hide the spinner and show go-back button
            document.getElementById('spinner').style.display = 'none';
            document.getElementById('go-back').style.display = 'block';
        })
        .catch(error => {
            console.error('Error fetching data:', error);
            document.getElementById('spinner').style.display = 'none';
            document.getElementById('go-back').style.display = 'block';
        });
}

function showStory(storyImagePath, storyTitle, storyContent) {
    const treeImage = document.getElementById('tree-image');
    const resultsDecoration = document.getElementById('results-decoration');
    const backButton = document.getElementById('go-back');
    if (!treeImage.classList.contains('double-blur-effect')) {
        treeImage.classList.add('double-blur-effect');
        resultsDecoration.classList.add('blur-effect');
        backButton.style.pointerEvents = 'none';
        backButton.classList.add('blur-effect');
        document.querySelectorAll('.leaf').forEach(el => {
            el.style.pointerEvents = 'none';
            el.classList.add('blur-effect');
        });

        const expandedLeaf = document.getElementById('leaf-expanded');
        if (expandedLeaf) {
            expandedLeaf.innerHTML = `
            <div>
                <img id="leaf-expanded-photo" src="${storyImagePath}" alt="${storyTitle}">
            </div>
            <h2>${storyTitle}</h2>
            <p style="margin-bottom: 50px;">${storyContent}</p>
            <a class="button" href="/form-page.html">留下回憶</a>
            `;
        }

        const collapseTrigger = document.getElementById('collapse-trigger')
        expandedLeaf.style.display = 'flex';
        expandedLeaf.style.opacity = '0';
        collapseTrigger.style.display = 'block';
        // Use setTimeout to delay the opacity change
        setTimeout(() => {
            expandedLeaf.style.opacity = '1';
        }, 10);
    }
}

function hideStory() {
    const expandedLeaf = document.getElementById('leaf-expanded');
    if (expandedLeaf) {
        expandedLeaf.style.opacity = '0';
        setTimeout(() => {
            expandedLeaf.style.display = 'none';
        }, 200); // Same as transition duration
    }
    const collapseTrigger = document.getElementById('collapse-trigger');
    if (collapseTrigger) {
        collapseTrigger.style.display = 'none';
    }
    // Remove blur effects and such
    const treeImage = document.getElementById('tree-image');
    const resultsDecoration = document.getElementById('results-decoration');
    const backButton = document.getElementById('go-back');
    if (treeImage.classList.contains('double-blur-effect')) {
        treeImage.classList.remove('double-blur-effect');
        resultsDecoration.classList.remove('blur-effect');
        backButton.style.pointerEvents = 'auto';
        backButton.classList.remove('blur-effect');
        document.querySelectorAll('.leaf').forEach(el => {
            el.style.pointerEvents = 'auto';
            el.classList.remove('blur-effect');
        });
    }
}
