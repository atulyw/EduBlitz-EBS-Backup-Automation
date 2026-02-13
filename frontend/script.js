// Replace this with your API Gateway invoke URL after deployment
const API_GATEWAY_URL = 'REPLACE_WITH_YOUR_API_GATEWAY_URL';

function getStatusEl() {
    return document.getElementById('statusMessage');
}

function getButtonEl() {
    return document.getElementById('createBackupBtn');
}

function showStatus(message, type) {
    const el = getStatusEl();
    el.textContent = '';
    el.className = 'status-message ' + (type || '');
    el.appendChild(document.createTextNode(message));
}

function showSnapshotResult(snapshotId) {
    const el = getStatusEl();
    el.textContent = '';
    el.className = 'status-message success';
    el.appendChild(document.createTextNode('Snapshot Created Successfully'));
    const idLine = document.createElement('span');
    idLine.className = 'snapshot-id';
    idLine.textContent = 'Snapshot ID: ' + snapshotId;
    el.appendChild(document.createElement('br'));
    el.appendChild(idLine);
}

function createSnapshot() {
    const btn = getButtonEl();
    btn.disabled = true;
    showStatus('Creating snapshot...', 'loading');

    fetch(API_GATEWAY_URL + '/backup', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
    })
        .then(function (response) {
            if (!response.ok) {
                return response.text().then(function (text) {
                    throw new Error(text || 'Request failed');
                });
            }
            return response.json();
        })
        .then(function (data) {
            // Lambda returns { statusCode: 200, body: "snap-xxx" }
            const snapshotId = typeof data === 'string' ? data : (data.body || data.snapshotId || data.SnapshotId || 'Unknown');
            showSnapshotResult(snapshotId);
        })
        .catch(function (err) {
            showStatus('Error: ' + (err.message || 'Could not create snapshot'), 'error');
        })
        .finally(function () {
            btn.disabled = false;
        });
}
