self.onmessage = function(event) {
    const data = event.data;

    const csvText = new TextDecoder().decode(data);
    
    parseCSV(csvText).then(result => {
        self.postMessage(result);
    }).catch(error => {
        // Handle the error or just forward it to the main thread
        self.postMessage({ error: error.message });
    });
};

// [Paste just the parseCSV and parseCSVRow functions here]

async function parseCSV(data) {
    try {

        // Trim the data to remove any leading/trailing whitespace or newlines
        data = data.trim();

        let results = [];
        let rows = data.split('\n');

        // If there's no data or headers, return an empty array
        if (rows.length === 0) return results;

        let headers = parseCSVRow(rows[0]);

        for (let i = 1; i < rows.length; i++) {
            // If the row is empty, continue to the next iteration
            if (!rows[i].trim()) continue;

            let cells = parseCSVRow(rows[i]);
            let obj = {};

            for (let j = 0; j < headers.length; j++) {
                obj[headers[j].trim()] = cells[j] ? cells[j].trim() : '';
            }

            results.push(obj);
        }

        return results;

    } catch (error) {
        console.error('Error fetching or parsing CSV:', error);
        return null;
    }
}
function parseCSVRow(row) {
    let cells = [];
    let inQuotes = false;
    let currentCell = '';

    for(let i = 0; i < row.length; i++) {
        let char = row[i];

        if(inQuotes) {
            if(char === '"') {
                if(i < row.length - 1 && row[i+1] === '"') {
                    // Handle double quote escape sequence
                    currentCell += '"';
                    i++; // Skip next character
                } else {
                    inQuotes = false;
                }
            } else {
                currentCell += char;
            }
        } else {
            if(char === ',') {
                cells.push(currentCell);
                currentCell = '';
            } else if(char === '"') {
                inQuotes = true;
            } else {
                currentCell += char;
            }
        }
    }

    cells.push(currentCell);

    return cells;
}