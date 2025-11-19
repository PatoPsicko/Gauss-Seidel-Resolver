// Elementos DOM
const els = {
    size: document.getElementById('systemSize'),
    matrixA: document.getElementById('matrixA'),
    vecB: document.getElementById('vectorB'),
    vars: document.getElementById('varNames'),
    eqs: document.getElementById('equalsContainer'),
    solveBtn: document.getElementById('solveButton'),
    loadBtn: document.getElementById('loadExampleButton'),
    results: document.getElementById('results'),
    tableHead: document.getElementById('tableHeaderRow'),
    tableBody: document.getElementById('tableBody'),
    status: document.getElementById('statusMessage'),
    detailContent: document.getElementById('detailContent'),
    baseFormulas: document.getElementById('baseFormulas')
};

// Generación de Inputs
function generateInputs(size) {
    els.matrixA.innerHTML = ''; els.vecB.innerHTML = ''; 
    els.vars.innerHTML = ''; els.eqs.innerHTML = '';
    
    els.matrixA.style.gridTemplateColumns = `repeat(${size}, minmax(60px, 1fr))`;
    
    for(let i=0; i<size; i++) {
        for(let j=0; j<size; j++) {
            const inp = document.createElement('input');
            inp.type = 'number';
            inp.id = `a_${i}_${j}`;
            inp.className = 'matrix-input h-10';
            inp.placeholder = `a${i+1}${j+1}`;
            els.matrixA.appendChild(inp);
        }
        
        const v = document.createElement('div');
        v.className = 'flex items-center justify-center h-10 font-serif italic text-gray-600';
        v.innerHTML = `x<sub>${i+1}</sub>`;
        els.vars.appendChild(v);

        const eq = document.createElement('div');
        eq.className = 'flex items-center justify-center h-10 font-bold text-gray-400';
        eq.textContent = '=';
        els.eqs.appendChild(eq);

        const binp = document.createElement('input');
        binp.type = 'number';
        binp.id = `b_${i}`;
        binp.className = 'matrix-input h-10';
        binp.placeholder = `b${i+1}`;
        els.vecB.appendChild(binp);
    }
}

function loadExample() {
    els.size.value = '3';
    generateInputs(3);
    resetUI();

    const A = [[2, 1, 1], [1, 3, -2], [1, -2, -3]];
    const B = [6, 13, -1];

    for(let i=0; i<3; i++) {
        for(let j=0; j<3; j++) {
            document.getElementById(`a_${i}_${j}`).value = A[i][j];
        }
        document.getElementById(`b_${i}`).value = B[i];
    }
}

function resetUI() {
    els.results.classList.add('hidden');
    els.detailContent.innerHTML = '<div class="text-center py-8 text-gray-500 italic"><p>Haz clic en cualquier número azul de la tabla para ver la fórmula usada.</p></div>';
    document.getElementById('solution').classList.add('hidden');
}

function solve() {
    resetUI();
    const size = parseInt(els.size.value);
    const A = [], b = [];

    try {
        for(let i=0; i<size; i++) {
            const row = [];
            for(let j=0; j<size; j++) {
                const val = parseFloat(document.getElementById(`a_${i}_${j}`).value);
                if(isNaN(val)) throw new Error(`Valor inválido en A[${i+1},${j+1}]`);
                row.push(val);
            }
            A.push(row);
            const bval = parseFloat(document.getElementById(`b_${i}`).value);
            if(isNaN(bval)) throw new Error(`Valor inválido en b[${i+1}]`);
            b.push(bval);
        }
    } catch(e) {
        alert(e.message);
        return;
    }

    const tol = parseFloat(document.getElementById('tolerance').value);
    const maxIter = parseInt(document.getElementById('maxIterations').value);

    // Check diagonal
    for(let i=0; i<size; i++) {
        if(A[i][i] === 0) {
            alert(`Error: La diagonal contiene un cero en la fila ${i+1}.`);
            return;
        }
    }

    // Dominancia
    const isDom = isDiagonallyDominant(A);
    els.status.className = isDom 
        ? "text-center font-medium mb-4 p-3 rounded-md bg-blue-100 text-blue-800"
        : "text-center font-medium mb-4 p-3 rounded-md bg-yellow-100 text-yellow-800";
    els.status.textContent = isDom 
        ? "Matriz diagonalmente dominante. Convergencia garantizada." 
        : "Advertencia: La matriz no es diagonalmente dominante. Podría no converger.";

    // Fórmulas base
    let formTxt = '';
    for(let i=0; i<size; i++) {
        formTxt += `x${i+1} = ( ${b[i]}`;
        for(let j=0; j<size; j++) {
            if(i!==j) formTxt += ` - (${A[i][j]})x${j+1}`;
        }
        formTxt += ` ) / ${A[i][i]}\n`;
    }
    els.baseFormulas.textContent = formTxt;

    // Ejecutar Método
    const result = gaussSeidel(A, b, tol, maxIter);
    renderTable(result.history, size);
    
    els.results.classList.remove('hidden');

    if(result.converged) {
        els.status.textContent += ` ¡Convergencia en ${result.iterations} iteraciones!`;
        els.status.classList.replace('bg-yellow-100', 'bg-green-100');
        els.status.classList.replace('text-yellow-800', 'text-green-800');
        
        document.getElementById('solutionText').textContent = result.solution.map((v,i)=>`x${i+1} = ${v.toFixed(6)}`).join('\n');
        document.getElementById('solution').classList.remove('hidden');
    } else {
        els.status.textContent = "No se alcanzó la convergencia en el límite de iteraciones.";
        els.status.className = "text-center font-medium mb-4 p-3 rounded-md bg-red-100 text-red-800";
    }
}

function gaussSeidel(A, b, tol, maxIter) {
    const n = b.length;
    let x = new Array(n).fill(0);
    let history = [];
    
    for(let k=0; k<maxIter; k++) {
        let x_old = [...x];
        let iterData = { iter: k+1, values: [], error: 0 };
        
        for(let i=0; i<n; i++) {
            let sum = 0;
            let parts = [];
            
            for(let j=0; j<n; j++) {
                if(i !== j) {
                    // Nota: x[j] es el valor más reciente disponible
                    sum += A[i][j] * x[j];
                    parts.push({
                        coeff: A[i][j],
                        varIdx: j+1,
                        valUsed: x[j], 
                        isNew: j < i // true si es valor actualizado en esta iter
                    });
                }
            }
            
            let newVal = (b[i] - sum) / A[i][i];
            x[i] = newVal;
            
            iterData.values.push({
                val: newVal,
                formula: { b: b[i], diag: A[i][i], parts: parts }
            });
        }

        let err = 0;
        for(let i=0; i<n; i++) err = Math.max(err, Math.abs(x[i] - x_old[i]));
        iterData.error = err;
        history.push(iterData);

        if(err <= tol) return { solution: x, history, converged: true, iterations: k+1 };
    }
    return { solution: x, history, converged: false, iterations: maxIter };
}

function renderTable(history, size) {
    // Header
    let hHTML = '<th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Iter</th>';
    for(let i=0; i<size; i++) hHTML += `<th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">x<sub>${i+1}</sub></th>`;
    hHTML += '<th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Error</th>';
    els.tableHead.innerHTML = hHTML;

    // Body
    els.tableBody.innerHTML = '';
    history.forEach(row => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50';
        
        // Columna Iteración
        tr.innerHTML = `<td class="px-4 py-2 whitespace-nowrap text-gray-500 font-bold border-r">${row.iter}</td>`;
        
        // Columnas Variables
        row.values.forEach((v, idx) => {
            const td = document.createElement('td');
            td.className = 'px-4 py-2 whitespace-nowrap text-blue-600 interactive-cell border-r';
            td.textContent = v.val.toFixed(6);
            
            // EVENTO CLICK SEGURO
            td.onclick = function() {
                try {
                    // 1. Limpiar selección previa
                    document.querySelectorAll('.interactive-cell').forEach(c => c.classList.remove('selected'));
                    // 2. Marcar actual
                    this.classList.add('selected');
                    // 3. Mostrar detalles
                    showDetails(row.iter, idx+1, v.val, v.formula);
                    
                    // 4. Scroll en móviles (opcional)
                    if(window.innerWidth < 1024) {
                        document.getElementById('detailContainerBox').scrollIntoView({behavior:'smooth'});
                    }
                } catch(err) {
                    console.error("Error al mostrar detalles:", err);
                }
            };
            
            tr.appendChild(td);
        });

        // Columna Error
        const errTd = document.createElement('td');
        errTd.className = 'px-4 py-2 whitespace-nowrap text-gray-500';
        errTd.textContent = row.error.toFixed(8);
        tr.appendChild(errTd);
        
        els.tableBody.appendChild(tr);
    });
}

function showDetails(iter, idx, val, data) {
    if(!data || !data.parts) return;

    const terms = data.parts.map(p => {
        const sign = p.coeff >= 0 ? '-' : '+'; // Invertido porque es (b - sum)
        const absC = Math.abs(p.coeff);
        const tag = p.isNew ? 
            '<span class="bg-green-100 text-green-800 text-[10px] px-1 rounded font-bold ml-1">NUEVO</span>' : 
            '<span class="bg-yellow-100 text-yellow-800 text-[10px] px-1 rounded font-bold ml-1">ANT.</span>';
        
        return `
            <div class="ml-6 mb-1 font-mono text-sm flex items-center flex-wrap">
                <span class="text-gray-400 font-bold mr-2 w-4 text-center">${sign}</span>
                <span class="text-gray-600">(${absC} × </span>
                <span class="text-blue-600 font-bold mx-1">${p.valUsed.toFixed(6)}</span>
                <span class="text-gray-600">)</span>
                <span class="text-gray-400 text-xs ml-2">← x<sub>${p.varIdx}</sub></span>
                ${tag}
            </div>
        `;
    }).join('');

    els.detailContent.innerHTML = `
        <div class="animate-fade-in">
            <div class="mb-4 border-b pb-2">
                <span class="text-xs text-gray-500 uppercase">Calculando</span>
                <h2 class="text-2xl font-bold text-blue-800">x<sub>${idx}</sub> <span class="text-sm font-normal text-gray-500">iteración ${iter}</span></h2>
            </div>

            <div class="bg-white border border-gray-200 rounded p-3 shadow-sm">
                <div class="font-mono text-sm mb-2 pb-2 border-b border-gray-100">
                    <span class="font-bold text-black text-lg">${data.b}</span> 
                    <span class="text-xs text-gray-400 ml-2">(Term. Indep. b<sub>${idx}</sub>)</span>
                </div>
                
                ${terms}
                
                <div class="mt-2 pt-2 border-t border-gray-300 font-mono text-sm">
                    <div class="flex items-center">
                        <span class="text-gray-400 font-bold mr-2 w-4 text-center">÷</span>
                        <span class="font-bold text-black text-lg">${data.diag}</span>
                        <span class="text-xs text-gray-400 ml-2">(Diagonal a<sub>${idx}${idx}</sub>)</span>
                    </div>
                </div>
            </div>

            <div class="mt-4 text-center flex justify-center items-center gap-2">
                <span class="text-2xl text-gray-300">=</span>
                <span class="text-3xl font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded">${val.toFixed(6)}</span>
            </div>
        </div>
    `;
}

function isDiagonallyDominant(A) {
    for(let i=0; i<A.length; i++) {
        let sum = 0;
        for(let j=0; j<A.length; j++) if(i!==j) sum += Math.abs(A[i][j]);
        if(Math.abs(A[i][i]) <= sum) return false;
    }
    return true;
}

// Init
els.solveBtn.addEventListener('click', solve);
els.loadBtn.addEventListener('click', loadExample);
els.size.addEventListener('change', (e) => { generateInputs(parseInt(e.target.value)); resetUI(); });

// Start
generateInputs(3);
