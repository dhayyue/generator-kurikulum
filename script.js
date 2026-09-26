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
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                });
                const data = await res.json();
                if (data.candidates && data.candidates[0].content) {
                    let text = data.candidates[0].content.parts[0].text;
                    this.resultHTML = text.replace(/```html/g, '').replace(/```/g, '');
                } else {
                    alert('Gagal memproses AI. Periksa kembali API Key Anda.');
                }
            } catch (e) {
                console.error(e);
                alert('Terjadi kesalahan koneksi.');
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