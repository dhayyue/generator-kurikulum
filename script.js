const GEMINI_MODEL = 'gemini-3.8-flash';

function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>'"]/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
    }[character]));
}

function buildFallbackDocument(title, form, details) {
    const selectedDimensi = form.selectedDimensi?.join(', ') || 'Belum ditentukan';
    return `<h2>${escapeHTML(title)}</h2>
        <p><strong>Dokumen dasar berhasil dibuat tanpa AI.</strong> Anda dapat mengedit atau melengkapinya sebelum dicetak.</p>
        <h3>Identitas Pembelajaran</h3>
        <table><tr><th>Sekolah</th><td>${escapeHTML(form.sekolah)}</td></tr>
        <tr><th>Guru</th><td>${escapeHTML(form.guru)} (${escapeHTML(form.nipGuru)})</td></tr>
        <tr><th>Mata Pelajaran</th><td>${escapeHTML(form.mapel)}</td></tr>
        <tr><th>Kelas / Fase</th><td>${escapeHTML(form.kelas)} / ${escapeHTML(form.fase)}</td></tr>
        <tr><th>Semester / Tahun</th><td>${escapeHTML(form.semester)} / ${escapeHTML(form.tahun)}</td></tr>
        <tr><th>Alokasi Waktu</th><td>${escapeHTML(form.alokasi)}</td></tr>
        <tr><th>Materi</th><td>${escapeHTML(form.materi)}</td></tr>
        <tr><th>Model Pembelajaran</th><td>${escapeHTML(form.model)}</td></tr>
        <tr><th>Dimensi Profil Lulusan</th><td>${escapeHTML(selectedDimensi)}</td></tr></table>
        <h3>Tujuan Pembelajaran</h3><p>${escapeHTML(form.tujuan)}</p>
        <h3>Rancangan Kegiatan</h3>
        <ol><li>Pendahuluan: apersepsi, motivasi, dan penyampaian tujuan.</li>
        <li>Kegiatan inti: eksplorasi materi, diskusi, praktik, dan presentasi.</li>
        <li>Penutup: refleksi, umpan balik, dan tindak lanjut.</li></ol>
        <h3>Catatan Pengembangan</h3><p>${escapeHTML(details)}</p>`;
}

async function generateWithRetry(prompt, apiKey, fallbackHTML) {
    const maxAttempts = 3;
    let lastError;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey.trim())}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });
            const data = await response.json();

            if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
                return { html: data.candidates[0].content.parts[0].text, usedFallback: false };
            }

            const message = data.error?.message || `Gemini API gagal (${response.status})`;
            lastError = new Error(message);
            const temporaryFailure = [429, 500, 502, 503, 504].includes(response.status) || /high demand|temporar|overload/i.test(message);
            if (!temporaryFailure) throw lastError;
        } catch (error) {
            lastError = error;
            if (!/Failed to fetch|network|high demand|temporar|overload/i.test(error.message)) throw error;
        }

        if (attempt < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, attempt * 2000));
        }
    }

    console.warn('Gemini tidak tersedia, memakai template cadangan:', lastError?.message);
    return { html: fallbackHTML, usedFallback: true };
}

function generatorApp() {
    return {
        apiKey: localStorage.getItem('gemini_api_key') || '',
        loading: false,
        resultHTML: '',
        form: {
            sekolah: 'SD Negeri 1 Cerdas Berkarakter',
            kepala: 'Dr. H. Ahmad Dahlan, M.Pd.',
            nipKepala: '19700101 199503 1 001',
            guru: 'Budi Santoso, S.Pd.',
            nipGuru: '19850520 201001 1 005',
            mapel: 'Ilmu Pengetahuan Alam',
            kelas: '4',
            fase: 'B',
            semester: '1 (Ganjil)',
            tahun: '2024/2025',
            alokasi: '2 x 35 Menit',
            kota: 'Jakarta',
            tanggal: '26 September 2026',
            materi: 'Bagian Tubuh Tumbuhan',
            model: 'Problem Based Learning',
            tujuan: 'Peserta didik dapat mengidentifikasi bagian bagian tubuh tumbuhan dan fungsinya dengan benar.'
        },
        init() {
            this.$watch('apiKey', val => localStorage.setItem('gemini_api_key', val));
        },
        async generate(type) {
            if (!this.apiKey) {
                alert('Silakan masukkan Gemini API Key terlebih dahulu!');
                return;
            }
            this.loading = true;
            this.resultHTML = '';

            let prompt = `Buatkan dokumen ${type} Kurikulum Merdeka yang lengkap dan profesional menggunakan format HTML bersih (h3, h4, p, ul, li, table). 
            Data Pendukung:
            - Sekolah: ${this.form.sekolah}
            - Guru: ${this.form.guru} (${this.form.nipGuru})
            - Mata Pelajaran: ${this.form.mapel} - Kelas ${this.form.kelas} (Fase ${this.form.fase})
            - Materi Pokok: ${this.form.materi}
            - Model Pembelajaran: ${this.form.model}
            - Tujuan Pembelajaran: ${this.form.tujuan}
            Berikan isi konten pembelajaran yang mendalam dan sesuai standar perangkat ajar kurikulum merdeka.`;

            try {
                const result = await generateWithRetry(prompt, this.apiKey, buildFallbackDocument('Dokumen Pembelajaran', this.form, `Jenis dokumen: ${type}`));
                this.resultHTML = result.html.replace(/```html/g, '').replace(/```/g, '');
                if (result.usedFallback) alert('Gemini sedang sibuk. Template cadangan berhasil digunakan.');
            } catch (e) {
                console.error(e);
                alert(`Gagal membuat dokumen: ${e.message}`);
            } finally {
                this.loading = false;
            }
        },
        printDoc() {
            const content = document.getElementById('previewArea').innerHTML;
            const original = document.body.innerHTML;
            document.body.innerHTML = content;
            window.print();
            document.body.innerHTML = original;
            window.location.reload();
        }
    }
}