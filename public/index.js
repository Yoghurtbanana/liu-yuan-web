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

                resultElement.className = "leaf";
                resultElement.innerHTML = `
                    ${data.title}
                `;
                resultElement.onclick = function() {
                    showStory(data.id);
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

function showStory(storyId) {
    window.location.href = '/story/' + storyId;
}
