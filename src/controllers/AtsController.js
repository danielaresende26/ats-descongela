import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export class AtsController {
    constructor(model, view) {
        this.model = model;
        this.view = view;

        // Bindings de Inicialização
        this.view.bindUploadCSV(this.handleCSVUpload.bind(this));
        this.view.bindSearch(this.handleSearch.bind(this));
        this.view.bindProcessXML(this.handleXMLImport.bind(this));
        this.view.bindDeductionChange(this.handleDeductionChange.bind(this));
        this.view.bindExportExcel(this.handleExportExcel.bind(this));
    }

    handleCSVUpload(file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target.result;
            const lines = text.split('\n');
            const cleanedCSV = lines.slice(2).join('\n'); // Ignora 2 linhas da SED

            Papa.parse(cleanedCSV, {
                header: true,
                delimiter: ';',
                skipEmptyLines: true,
                complete: (results) => {
                    this.model.processCSVData(results.data);
                    this._refreshView();
                }
            });
        };
        reader.readAsText(file, 'ISO-8859-1');
    }

    handleSearch(searchTerm) {
        const filtered = this.model.getFilteredData(searchTerm);
        this.view.renderTable(filtered, this.model);
    }

    handleXMLImport(xmlString) {
        if (!xmlString.trim()) {
            alert('Cole o XML primeiro!');
            return;
        }

        try {
            const count = this.model.importFromXML(xmlString);
            if (count > 0) {
                alert(`${count} registro(s) de log processado(s) com sucesso!`);
                this.view.closeModal();
                this._refreshView();
            } else {
                alert('Nenhum dado de log válido encontrado no XML colado.');
            }
        } catch (err) {
            console.error(err);
            alert('Erro ao processar XML. Verifique o formato colado.');
        }
    }

    handleDeductionChange(cpf, di, year, days) {
        this.model.saveDeduction(cpf, di, year, days);
        this._refreshView(); // Atualiza painel e conta visualmente
    }

    handleExportExcel() {
        if (this.model.appData.length === 0) {
            alert('Importe dados primeiro!');
            return;
        }

        const excelData = this.model.generateExcelData();
        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Resultado_ATS_Por_Escola");
        XLSX.writeFile(workbook, "Analise_ATS_Resultado_Final.xlsx");
    }

    // Helper interno para atualizar tabela principal e sumário garantindo o estado atual.
    _refreshView() {
        const term = this.view.searchInput ? this.view.searchInput.value : '';
        const filtered = this.model.getFilteredData(term);
        
        const otherCount = this.model.appData.filter(r => r.ua !== this.model.mainUA).length;
        
        this.view.renderSummary(this.model.mainUA, this.model.appData.length, otherCount);
        this.view.renderTable(filtered, this.model);
    }
}
