import { format } from 'date-fns';

export class AtsView {
    constructor() {
        this.app = document.querySelector('#app');
        this.initStructure();
        
        // Caches
        this.csvFileInput = document.getElementById('csvFile');
        this.importXmlBtn = document.getElementById('importXmlBtn');
        this.exportBtn = document.getElementById('exportBtn');
        this.searchInput = document.getElementById('searchInput');
        this.tbody = document.querySelector('#resultsTable tbody');
        this.summaryDiv = document.getElementById('summary');
        
        // Modal Caches
        this.xmlModal = document.getElementById('xmlModal');
        this.closeXmlModalBtn = document.getElementById('closeXmlModal');
        this.cancelXmlBtn = document.getElementById('cancelXml');
        this.processXmlBtn = document.getElementById('processXml');
        this.xmlInput = document.getElementById('xmlInput');

        this.initModalLogic();
    }

    initStructure() {
        const Icons = {
            Upload: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
            Download: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
            Code: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`
        };

        this.app.innerHTML = `
          <header>
            <h1>Sistema de Análise ATS</h1>
            <div class="controls">
              <label class="btn btn-secondary">
                ${Icons.Upload} Importar CSV
                <input type="file" id="csvFile" class="file-input" accept=".csv" />
              </label>
              <button id="importXmlBtn" class="btn btn-secondary">
                ${Icons.Code} Importar Log (XML)
              </button>
              <button id="exportBtn" class="btn btn-primary">
                ${Icons.Download} Exportar Excel
              </button>
            </div>
          </header>

          <div id="summary" class="summary-grid" style="display:none">
            <div class="summary-item">
              <div class="summary-label">Escola Principal</div>
              <div id="mainUAName" class="summary-value">-</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Total de Servidores</div>
              <div id="totalServers" class="summary-value">0</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">UAs Externas Detectadas</div>
              <div id="otherUACount" class="summary-value">0</div>
            </div>
          </div>

          <div class="card">
            <input type="text" id="searchInput" class="search-bar" placeholder="Pesquisar por nome, CPF ou UA..." />
            <div class="table-container">
              <table id="resultsTable">
                <thead>
                  <tr>
                    <th>UA</th>
                    <th>CPF</th>
                    <th>Nome</th>
                    <th>Qt</th>
                    <th>Última Concessão</th>
                    <th>Previsão SED</th>
                    <th>Cálculo Atualizado</th>
                    <th>Status</th>
                    <th>Descontos (Dias/Ano)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colspan="9" style="text-align:center; padding: 3rem; color: var(--text-muted)">
                      Sessão limpa. Importe um arquivo CSV para começar a análise de hoje.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div id="xmlModal" class="modal-overlay">
            <div class="modal-content">
              <div class="modal-header">
                <h2>Importar Log de Cálculo (XML)</h2>
                <span class="close-btn" id="closeXmlModal">&times;</span>
              </div>
              <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">
                Cole aqui o código XML gerado pela consulta interna da SED. O sistema irá extrair automaticamente as faltas e preencher a grade.
              </p>
              <textarea id="xmlInput" class="import-textarea" placeholder="Cole o XML aqui..."></textarea>
              <div class="modal-footer">
                <button id="cancelXml" class="btn btn-secondary">Cancelar</button>
                <button id="processXml" class="btn btn-primary">Processar XML</button>
              </div>
            </div>
          </div>
        `;
    }

    initModalLogic() {
        this.importXmlBtn.addEventListener('click', () => {
            this.xmlModal.style.display = 'flex';
        });

        const closeFunc = () => {
            this.xmlModal.style.display = 'none';
            this.xmlInput.value = '';
        };

        this.closeXmlModalBtn.addEventListener('click', closeFunc);
        this.cancelXmlBtn.addEventListener('click', closeFunc);
    }

    closeModal() {
        this.xmlModal.style.display = 'none';
        this.xmlInput.value = '';
    }

    // Binders para o Controller
    bindUploadCSV(handler) {
        this.csvFileInput.addEventListener('change', e => {
            const file = e.target.files[0];
            if (file) handler(file);
        });
    }

    bindSearch(handler) {
        this.searchInput.addEventListener('input', e => {
            handler(e.target.value);
        });
    }

    bindProcessXML(handler) {
        this.processXmlBtn.addEventListener('click', () => {
            handler(this.xmlInput.value);
        });
    }

    bindExportExcel(handler) {
        this.exportBtn.addEventListener('click', () => {
            handler();
        });
    }

    // Passamos o model instanciado para buscar os dados em tempo real ao montar a UI
    // Permite delegar inputs para alteração do Model localmente.
    renderTable(filteredData, model) {
        if (!filteredData || filteredData.length === 0) {
            this.tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding: 3rem; color: var(--text-muted)">Nenhum dado encontrado..</td></tr>`;
            return;
        }

        const searchTerm = this.searchInput.value.toLowerCase();
        
        this.tbody.innerHTML = filteredData.map(row => {
            const totalDeductions = model.getTotalDeductions(row.cpf, row.di);
            const calculatedDate = model.calculateNextATSDate(row.ultima, totalDeductions);
            const formattedCalcDate = calculatedDate ? format(calculatedDate, 'dd/MM/yyyy') : '-';
            
            const isOtherUA = row.ua !== model.mainUA;
            const uaClass = isOtherUA ? 'other-ua' : '';
            
            const sedDateStr = row.setPrevista;
            const isDiff = sedDateStr !== '-' && formattedCalcDate !== sedDateStr;
            const statusHTML = isDiff 
                ? `<span class="status-badge status-diff">Divergente</span>`
                : `<span class="status-badge status-ok">OK</span>`;

            return `
                <tr>
                    <td class="${uaClass}">${row.ua}</td>
                    <td>${row.cpf}</td>
                    <td>${row.nome}</td>
                    <td>${row.qt}</td>
                    <td>${row.ultima}</td>
                    <td>${row.setPrevista}</td>
                    <td><strong style="color: var(--primary-color)">${formattedCalcDate}</strong></td>
                    <td>${statusHTML}</td>
                    <td>
                        <div class="deduction-grid">
                            ${this._renderDeductionInputs(row.cpf, row.di, model)}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    _renderDeductionInputs(cpf, di, model) {
        const currentDeductions = model.getDeductions(cpf, di);
        const years = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];
        
        return years.map(year => `
            <div class="deduction-item">
                <input type="number" 
                       class="deduction-input" 
                       data-cpf="${cpf}" 
                       data-di="${di}" 
                       data-year="${year}" 
                       value="${currentDeductions[year] || ''}" 
                       placeholder="0">
                <span class="year-label">${year}</span>
            </div>
        `).join('');
    }

    bindDeductionChange(handler) {
        // Event delegation na tabela par escutar qualquer mudança nos inputs
        this.tbody.addEventListener('change', e => {
            if (e.target.classList.contains('deduction-input')) {
                const { cpf, di, year } = e.target.dataset;
                const value = parseInt(e.target.value) || 0;
                handler(cpf, di, year, value);
            }
        });
    }

    renderSummary(mainUA, total, otherCount) {
        this.summaryDiv.style.display = 'grid';
        document.getElementById('mainUAName').textContent = mainUA;
        document.getElementById('totalServers').textContent = total;
        document.getElementById('otherUACount').textContent = otherCount;
    }
}
