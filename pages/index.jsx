import React, { useState, useMemo, useRef, useEffect } from 'react';

export default function Home() {
  const sampleData = [
    { id: 1, name: 'Clayton Shallue', company: 'Civil Services WA', role: 'Operator', courseCode: 'RTIOIRARP', courseDescription: 'RTIO Individual Rail Access Road Permit', expiryDate: '31/03/2024', status: 'Expired' },
    { id: 2, name: 'Disa Shallue', company: 'Civil Services WA', role: 'Operator', courseCode: 'RTIOLG', courseDescription: 'RTIO LG Grader', expiryDate: '03/05/2027', status: 'Current' },
    { id: 3, name: 'John Smith', company: 'Civil Services WA', role: 'Supervisor', courseCode: 'RTIOLC', courseDescription: 'RTIO Land Clearing', expiryDate: '15/06/2026', status: 'Current' },
  ];

  const [trainingData, setTrainingData] = useState(sampleData);
  const [selectedLearner, setSelectedLearner] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('Civil Services WA');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [searchLearner, setSearchLearner] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const fileInputRef = useRef(null);

  const learners = useMemo(() => [...new Set(trainingData.map(d => d.name))].sort(), [trainingData]);
  const companies = useMemo(() => [...new Set(trainingData.map(d => d.company))], [trainingData]);
  const courses = useMemo(() => [...new Set(trainingData.map(d => d.courseCode))].sort(), [trainingData]);
  const statuses = ['Current', 'Expired', 'Due to Expire'];

  const filteredData = useMemo(() => {
    return trainingData.filter(record => {
      const matchLearner = !selectedLearner || record.name === selectedLearner;
      const matchCompany = !selectedCompany || record.company === selectedCompany;
      const matchStatus = !selectedStatus || record.status === selectedStatus;
      const matchCourse = !selectedCourse || record.courseCode === selectedCourse;
      const matchSearch = !searchLearner || record.name.toLowerCase().includes(searchLearner.toLowerCase());
      return matchLearner && matchCompany && matchStatus && matchCourse && matchSearch;
    });
  }, [selectedLearner, selectedCompany, selectedStatus, selectedCourse, searchLearner, trainingData]);

  const summary = useMemo(() => {
    const companyData = selectedCompany ? trainingData.filter(d => d.company === selectedCompany) : trainingData;
    return {
      current: companyData.filter(d => d.status === 'Current').length,
      expired: companyData.filter(d => d.status === 'Expired').length,
      dueExpire: companyData.filter(d => d.status === 'Due to Expire').length,
      total: companyData.length,
    };
  }, [selectedCompany, trainingData]);

  const handleCSVImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csv = e.target.result;
        const lines = csv.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        const importedData = [];
        let id = trainingData.length + 1;

        for (let i = 1; i < lines.length; i++) {
          if (lines[i].trim() === '') continue;
          
          const values = lines[i].split(',').map(v => v.trim());
          const record = {};
          
          headers.forEach((header, index) => {
            record[header] = values[index] || '';
          });

          if (record.name || record['Learner Name']) {
            importedData.push({
              id: id++,
              name: record['Learner Name'] || record['name'] || '',
              company: record['Company'] || record['company'] || 'Civil Services WA',
              role: record['Role'] || record['role'] || 'Operator',
              courseCode: record['Course Code'] || record['courseCode'] || '',
              courseDescription: record['Course Description'] || record['courseDescription'] || '',
              expiryDate: record['Expiry Date'] || record['expiryDate'] || '',
              status: record['Status'] || record['status'] || 'Current',
            });
          }
        }

        if (importedData.length > 0) {
          setTrainingData([...trainingData, ...importedData]);
          setLastUpdated(new Date());
          setShowImportModal(false);
          alert(`Successfully imported ${importedData.length} records!`);
          fileInputRef.current.value = '';
        } else {
          alert('No valid records found in CSV');
        }
      } catch (error) {
        alert('Error parsing CSV: ' + error.message);
      }
    };
    reader.readAsText(file);
  };

  const exportCSV = () => {
    const headers = ['Learner Name', 'Company', 'Role', 'Course Code', 'Course Description', 'Expiry Date', 'Status'];
    const csvContent = [
      headers.join(','),
      ...filteredData.map(record =>
        [record.name, record.company, record.role, record.courseCode, record.courseDescription, record.expiryDate, record.status].join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smartcompliance-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Current': return '#22c55e';
      case 'Expired': return '#ef4444';
      case 'Due to Expire': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      {showImportModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', maxWidth: '500px' }}>
            <h2 style={{ margin: '0 0 1rem 0', fontSize: '20px', fontWeight: '600' }}>Import Training Data</h2>
            <p style={{ margin: '0 0 1.5rem 0', color: '#666', fontSize: '14px' }}>
              Upload a CSV file from JotForm.
            </p>
            <div style={{ border: '2px dashed #ddd', borderRadius: '8px', padding: '2rem', textAlign: 'center', marginBottom: '1.5rem' }}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleCSVImport}
                style={{ display: 'none' }}
              />
              <button
                onClick={() => fileInputRef.current.click()}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#ea580c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Choose CSV File
              </button>
            </div>
            <button
              onClick={() => setShowImportModal(false)}
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: '#e5e7eb',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ width: '40px', height: '40px', backgroundColor: '#ea580c', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '24px', fontWeight: 'bold' }}>✓</div>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '600' }}>SmartCompliance</h1>
        </div>
        <p style={{ margin: '0 0 0.5rem 0', color: '#666', fontSize: '14px' }}>Training & Compliance Dashboard</p>
        <p style={{ margin: '0.5rem 0 0 0', color: '#999', fontSize: '12px' }}>Last updated: {lastUpdated.toLocaleTimeString()}</p>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <button onClick={() => setShowImportModal(true)} style={{ padding: '0.75rem 1.5rem', backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>📤 Import CSV</button>
        <button onClick={exportCSV} style={{ padding: '0.75rem 1.5rem', backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>📥 Export CSV</button>
        <button style={{ padding: '0.75rem 1.5rem', backgroundColor: '#ea580c', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>📄 Export PDF</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <p style={{ margin: '0 0 0.5rem 0', color: '#999', fontSize: '12px', fontWeight: '500', textTransform: 'uppercase' }}>Total Records</p>
          <p style={{ margin: 0, fontSize: '32px', fontWeight: '600', color: '#3b82f6' }}>{summary.total}</p>
        </div>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <p style={{ margin: '0 0 0.5rem 0', color: '#999', fontSize: '12px', fontWeight: '500', textTransform: 'uppercase' }}>Current</p>
          <p style={{ margin: 0, fontSize: '32px', fontWeight: '600', color: '#22c55e' }}>{summary.current}</p>
        </div>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <p style={{ margin: '0 0 0.5rem 0', color: '#999', fontSize: '12px', fontWeight: '500', textTransform: 'uppercase' }}>Expired</p>
          <p style={{ margin: 0, fontSize: '32px', fontWeight: '600', color: '#ef4444' }}>{summary.expired}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '2rem' }}>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e7eb', height: 'fit-content' }}>
          <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '16px', fontWeight: '600' }}>Filters</h3>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '12px', fontWeight: '500', textTransform: 'uppercase' }}>Learner Name</label>
            <input
              type="text"
              placeholder="Search..."
              value={searchLearner}
              onChange={(e) => setSearchLearner(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', fontSize: '14px', border: '1px solid #ddd', borderRadius: '6px', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '12px', fontWeight: '500' }}>Status</label>
            {statuses.map(status => (
              <label key={status} style={{ display: 'flex', alignItems: 'center', padding: '0.5rem 0', cursor: 'pointer', fontSize: '14px' }}>
                <input
                  type="checkbox"
                  checked={selectedStatus === status}
                  onChange={() => setSelectedStatus(selectedStatus === status ? '' : status)}
                  style={{ marginRight: '0.5rem', cursor: 'pointer' }}
                />
                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: getStatusColor(status), marginRight: '0.5rem' }}></span>
                {status}
              </label>
            ))}
          </div>
        </div>

        <div style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>Training Matrix ({filteredData.length} records)</h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Learner</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Course Code</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Description</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Expiry</th>
                  <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length > 0 ? (
                  filteredData.map((record) => (
                    <tr key={record.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '1rem' }}>{record.name}</td>
                      <td style={{ padding: '1rem', fontSize: '12px', fontFamily: 'monospace' }}>{record.courseCode}</td>
                      <td style={{ padding: '1rem', color: '#666' }}>{record.courseDescription}</td>
                      <td style={{ padding: '1rem' }}>{record.expiryDate}</td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <span style={{ display: 'inline-block', padding: '0.25rem 0.75rem', borderRadius: '4px', backgroundColor: getStatusColor(record.status), color: 'white', fontSize: '12px', fontWeight: '500' }}>
                          {record.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>
                      No records match your filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
