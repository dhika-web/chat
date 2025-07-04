document.addEventListener('DOMContentLoaded', () => {
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    const resultsContainer = document.getElementById('results-container');

    searchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const searchTerm = searchInput.value.trim();
        if (!searchTerm) return;

        resultsContainer.innerHTML = '<p>Mencari...</p>';

        try {
            // Panggil API di server untuk mencari
            const response = await fetch(`/api/search?term=${encodeURIComponent(searchTerm)}`);
            if (!response.ok) {
                throw new Error('Gagal melakukan pencarian.');
            }
            const results = await response.json();
            
            displayResults(results);
        } catch (error) {
            resultsContainer.innerHTML = `<p style="color: red;">${error.message}</p>`;
        }
    });

    function displayResults(results) {
        if (results.length === 0) {
            resultsContainer.innerHTML = '<p>Tidak ada hasil yang ditemukan.</p>';
            return;
        }

        resultsContainer.innerHTML = ''; // Kosongkan hasil sebelumnya
        
        // Kelompokkan hasil berdasarkan room_id
        const groupedResults = results.reduce((acc, msg) => {
            (acc[msg.room_id] = acc[msg.room_id] || []).push(msg);
            return acc;
        }, {});

        for (const roomId in groupedResults) {
            const conversationDiv = document.createElement('div');
            conversationDiv.className = 'conversation';
            
            const header = document.createElement('h3');
            header.textContent = `Percakapan dengan: ${groupedResults[roomId][0].username} (ID: ${roomId.substring(0, 8)}...)`;
            conversationDiv.appendChild(header);

            const messageList = document.createElement('ul');
            groupedResults[roomId].forEach(msg => {
                const item = document.createElement('li');
                item.innerHTML = `<strong>${msg.username}</strong>: ${msg.message} <span class="timestamp">${new Date(msg.timestamp).toLocaleString('id-ID')}</span>`;
                messageList.appendChild(item);
            });
            conversationDiv.appendChild(messageList);
            resultsContainer.appendChild(conversationDiv);
        }
    }
});