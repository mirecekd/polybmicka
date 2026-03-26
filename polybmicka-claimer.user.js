// ==UserScript==
// @name         PolyBMiCka - Claimer
// @namespace    https://github.com/mirecekd/polybmicka
// @version      0.1.0
// @description  Auto-claim resolved positions on Polymarket portfolio page
// @author       mirecekd
// @match        https://polymarket.com/portfolio*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const CONFIG = {
        CHECK_INTERVAL: 60000, // 60 seconds
        VERSION: '0.1.0',
        MAX_LOG_LINES: 50,
    };

    // ── UI Overlay ──────────────────────────────────────────────────────

    function createOverlay() {
        const wrapper = document.createElement('div');
        wrapper.id = 'pbm-claimer-wrapper';
        wrapper.style.cssText = `
            position: fixed;
            top: 80px;
            left: 12px;
            z-index: 99999;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            color: #e0e0e0;
            background: rgb(58,58,58);
            border: 1px solid #555;
            border-radius: 6px;
            padding: 8px 10px;
            width: 280px;
            user-select: none;
        `;

        // ── Header ──
        const header = document.createElement('div');
        header.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;';
        header.innerHTML = `<span style="font-weight:bold; color:#4fc3f7;">PolyBMiCka Claimer v${CONFIG.VERSION}</span>`;
        wrapper.appendChild(header);

        // ── Claim All button ──
        const claimAllBtn = document.createElement('button');
        claimAllBtn.textContent = 'Claim All';
        claimAllBtn.style.cssText = `
            display: block;
            width: 100%;
            padding: 6px 0;
            margin-bottom: 6px;
            background: #4caf50;
            color: #fff;
            border: none;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            font-weight: bold;
            cursor: pointer;
        `;
        claimAllBtn.addEventListener('mouseenter', () => { claimAllBtn.style.background = '#66bb6a'; });
        claimAllBtn.addEventListener('mouseleave', () => { claimAllBtn.style.background = '#4caf50'; });
        claimAllBtn.addEventListener('click', () => { claimAll(); });
        wrapper.appendChild(claimAllBtn);

        // ── Status line ──
        const statusLine = document.createElement('div');
        statusLine.id = 'pbm-claimer-status';
        statusLine.style.cssText = 'margin-bottom: 6px; color: #aaa;';
        statusLine.textContent = 'Status: waiting...';
        wrapper.appendChild(statusLine);

        // ── Log window ──
        const logBox = document.createElement('div');
        logBox.id = 'pbm-claimer-log';
        logBox.style.cssText = `
            height: 180px;
            overflow-y: auto;
            background: #1e1e1e;
            border: 1px solid #444;
            border-radius: 4px;
            padding: 4px 6px;
            font-size: 11px;
            color: #ccc;
            line-height: 1.4;
        `;
        wrapper.appendChild(logBox);

        document.body.appendChild(wrapper);

        return { wrapper, claimAllBtn, statusLine, logBox };
    }

    // ── Logging ─────────────────────────────────────────────────────────

    let logBox = null;

    function log(msg, color) {
        const now = new Date();
        const ts = now.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const line = document.createElement('div');
        if (color) line.style.color = color;
        line.textContent = `[${ts}] ${msg}`;
        logBox.appendChild(line);

        // trim old lines
        while (logBox.childElementCount > CONFIG.MAX_LOG_LINES) {
            logBox.removeChild(logBox.firstChild);
        }

        // auto-scroll
        logBox.scrollTop = logBox.scrollHeight;

        console.log(`[PolyBMiCka-Claimer] ${msg}`);
    }

    // ── Claim logic ─────────────────────────────────────────────────────

    function findClaimButtons() {
        // Look for buttons with text "Claim" on the portfolio page
        const allButtons = document.querySelectorAll('button');
        const claimButtons = [];
        for (const btn of allButtons) {
            const text = btn.textContent.trim();
            if (text === 'Claim' || text === 'Claim Winnings' || text === 'Redeem') {
                // skip our own button
                if (btn.closest('#pbm-claimer-wrapper')) continue;
                claimButtons.push(btn);
            }
        }
        return claimButtons;
    }

    function findModalClaimButton() {
        // After clicking Claim, a modal appears with "Claim $X.XX" confirmation button
        const allButtons = document.querySelectorAll('button');
        for (const btn of allButtons) {
            const text = btn.textContent.trim();
            // Match "Claim $1.26" or "Redeem $1.26" style confirmation buttons in modal
            if (/^(Claim|Redeem) \$[\d.,]+$/.test(text)) {
                if (btn.closest('#pbm-claimer-wrapper')) continue;
                return btn;
            }
        }
        return null;
    }

    function findDoneButton() {
        // After successful claim, a "Done" button appears in the modal
        const allButtons = document.querySelectorAll('button');
        for (const btn of allButtons) {
            const text = btn.textContent.trim();
            if (text === 'Done') {
                if (btn.closest('#pbm-claimer-wrapper')) continue;
                return btn;
            }
        }
        return null;
    }

    function clickButton(btn) {
        btn.click();
    }

    function clickWithModalConfirm(btn) {
        // Step 1: click the initial Claim button
        clickButton(btn);
        log(`Clicked: "${btn.textContent.trim()}"`, '#4fc3f7');

        // Step 2: wait for modal to appear, then click confirmation
        setTimeout(() => {
            const modalBtn = findModalClaimButton();
            if (modalBtn) {
                clickButton(modalBtn);
                log(`Confirmed: "${modalBtn.textContent.trim()}"`, '#4caf50');
            } else {
                log('No modal confirmation button found (yet)', '#ff9800');
                // retry once more after another 500ms
                setTimeout(() => {
                    const retry = findModalClaimButton();
                    if (retry) {
                        clickButton(retry);
                        log(`Confirmed (retry): "${retry.textContent.trim()}"`, '#4caf50');
                    }
                }, 500);
            }
        }, 1000);
    }

    function claimAll() {
        const buttons = findClaimButtons();
        if (buttons.length === 0) {
            log('No Claim buttons found on page.', '#ff9800');
            updateStatus('No Claim buttons found');
            return;
        }
        log(`Found ${buttons.length} Claim button(s) - clicking...`, '#4caf50');

        // Chain: Claim -> Claim $X.XX -> Done -> next
        let idx = 0;
        function clickNext() {
            if (idx >= buttons.length) {
                updateStatus(`Claimed ${buttons.length} button(s)`);
                return;
            }
            const btn = buttons[idx];
            clickButton(btn);
            log(`Clicked: "${btn.textContent.trim()}"`, '#4fc3f7');

            // Step 2: wait for modal confirm button
            setTimeout(() => {
                const modalBtn = findModalClaimButton();
                if (modalBtn) {
                    clickButton(modalBtn);
                    log(`Confirmed: "${modalBtn.textContent.trim()}"`, '#4caf50');
                }
                // Step 3: wait for Done button
                setTimeout(() => {
                    const doneBtn = findDoneButton();
                    if (doneBtn) {
                        clickButton(doneBtn);
                        log('Clicked: "Done"', '#aaa');
                    }
                    idx++;
                    // wait for modal to fully close before next claim
                    setTimeout(clickNext, 1000);
                }, 1500);
            }, 1000);
        }
        clickNext();
    }

    function updateStatus(text) {
        const el = document.getElementById('pbm-claimer-status');
        if (el) el.textContent = `Status: ${text}`;
    }

    // ── Main check loop ─────────────────────────────────────────────────

    function checkForClaims() {
        const now = new Date();
        const ts = now.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        // Priority 1: check for Done button (leftover from previous claim)
        const doneBtn = findDoneButton();
        if (doneBtn) {
            clickButton(doneBtn);
            log(`${ts} - Clicked leftover "Done" button`, '#aaa');
            updateStatus('Closed Done modal');
            return;
        }

        // Priority 2: check for open modal with Claim/Redeem $X.XX
        const modalBtn = findModalClaimButton();
        if (modalBtn) {
            log(`${ts} - Modal confirm button found, clicking...`, '#4caf50');
            clickButton(modalBtn);
            log(`Confirmed: "${modalBtn.textContent.trim()}"`, '#4caf50');
            updateStatus('Confirmed modal claim');
            return;
        }

        // Priority 3: find Claim/Redeem buttons and start the chain
        const buttons = findClaimButtons();

        if (buttons.length > 0) {
            log(`${ts} - Found ${buttons.length} Claim button(s)!`, '#4caf50');
            updateStatus(`${buttons.length} Claim button(s) found - auto-claiming`);

            // Chain: Claim -> Claim $X.XX -> Done -> next
            let idx = 0;
            function autoClickNext() {
                if (idx >= buttons.length) return;
                const btn = buttons[idx];
                try {
                    clickButton(btn);
                    log(`Auto-clicked: "${btn.textContent.trim()}"`, '#4fc3f7');
                } catch (e) {
                    log(`Error clicking: ${e.message}`, '#f44336');
                }
                // Step 2: confirm modal
                setTimeout(() => {
                    const confirm = findModalClaimButton();
                    if (confirm) {
                        clickButton(confirm);
                        log(`Auto-confirmed: "${confirm.textContent.trim()}"`, '#4caf50');
                    }
                    // Step 3: click Done
                    setTimeout(() => {
                        const done = findDoneButton();
                        if (done) {
                            clickButton(done);
                            log('Auto-clicked: "Done"', '#aaa');
                        }
                        idx++;
                        if (idx < buttons.length) {
                            setTimeout(autoClickNext, 1000);
                        }
                    }, 1500);
                }, 1000);
            }
            autoClickNext();
        } else {
            log(`${ts} - checking... no Claim buttons`, '#888');
            updateStatus('Watching... no claims');
        }
    }

    // ── Bootstrap ───────────────────────────────────────────────────────

    function init() {
        const ui = createOverlay();
        logBox = ui.logBox;

        log('Claimer started, watching for Claim buttons...', '#4fc3f7');
        log(`Check interval: ${CONFIG.CHECK_INTERVAL / 1000}s`, '#aaa');
        updateStatus('Watching...');

        // initial check
        checkForClaims();

        // periodic check
        setInterval(checkForClaims, CONFIG.CHECK_INTERVAL);
    }

    // wait for page to settle, then init
    setTimeout(init, 2000);
})();
