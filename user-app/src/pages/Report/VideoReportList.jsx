// src/components/VideoReportList.jsx
import React, { useEffect, useMemo, useState } from 'react';
import './VideoReportList.css';
import { fetchVideoList, deleteVideoReport } from '../../api/video';
import { Link } from 'react-router-dom';

const PAGE_SIZE = 5;
const USER_NO = 1; // 로그인 없으니 임시 값

export default function VideoReportList() {
  const [reports, setReports] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedIds, setSelectedIds] = useState(() => new Set()); // 선택된 id들
  const [searchTerm, setSearchTerm] = useState(''); // 제목 검색 기능

  // 목록 불러오기
  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        const data = await fetchVideoList(USER_NO);

        // API 필드 → 프론트 필드 매핑(안전)
        const mapped = (data || []).map(r => ({
          id: r.id ?? r.record_no,
          title: r.title ?? r.r_title ?? '제목 없음',
          date: r.r_date ?? r.date ?? '-',
          author: '-', // 백엔드에 없으면 기본값
        }));

        // 최신순 정렬 (날짜 DESC, 동일 날짜면 id DESC)
        mapped.sort((a, b) => {
          const da = new Date(a.date), db = new Date(b.date);
          if (!isNaN(db - da) && (db - da) !== 0) return db - da;
          return (b.id || 0) - (a.id || 0);
        });

        setReports(mapped);
        setSelectedIds(new Set());
        setCurrentPage(1);
      } catch (e) {
        console.error(e);
        setError('목록을 불러오지 못했습니다.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // 검색 필터
  const filteredReports = useMemo(() => {
    if (!searchTerm) return reports;
    return reports.filter(r =>
      (r.title || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [reports, searchTerm]);

  // 페이지 계산
  const totalPages = Math.max(1, Math.ceil(filteredReports.length / PAGE_SIZE));
  const page = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredReports.slice(start, start + PAGE_SIZE);
  }, [filteredReports, currentPage]);

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  // 체크박스 토글
  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ✅ 선택 삭제 (휴지통 버튼과 연결)
  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) {
      alert('삭제할 보고서를 선택해 주세요.');
      return;
    }
    if (!window.confirm(`${selectedIds.size}건을 삭제할까요?`)) return;

    try {
      const ids = Array.from(selectedIds);
      await Promise.all(ids.map(id => deleteVideoReport(id)));
      setReports(prev => prev.filter(r => !selectedIds.has(r.id)));
      setSelectedIds(new Set());
    } catch (e) {
      console.error(e);
      alert('선택 삭제 중 오류가 발생했습니다.');
    }
  };

  if (isLoading) return <div className="loading">로딩 중...</div>;
  if (error) return <div className="error">{error}</div>;

  const isAllEmpty = reports.length === 0;
  const isSearchEmpty = !isAllEmpty && filteredReports.length === 0;

  return (
    <main className="page-offset">
      <div className="video-report-list-container">
        <h2>영상 보고서</h2>

        {/* 검색 + 삭제 툴바 */}
        <form className="toolbar" onSubmit={handleSearch}>
          <input
            className="toolbar__input"
            type="text"
            placeholder="제목으로 검색"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <button className="icon-btn" type="submit" title="검색" aria-label="검색">
            🔍
          </button>
          <button
            className="icon-btn icon-btn--danger"
            type="button"
            title="선택 삭제"
            onClick={handleDeleteSelected}
            disabled={selectedIds.size === 0 || reports.length === 0} // ✅ 데이터 없을 때 비활성
            aria-disabled={selectedIds.size === 0 || reports.length === 0}
          >
            🗑
          </button>
        </form>

        {/* 빈 상태 안내 배너 */}
        {(isAllEmpty || isSearchEmpty) && (
          <div className="empty-hint" role="status" aria-live="polite">
            {isAllEmpty && !searchTerm && '아직 등록된 영상 보고서가 없어요. 분석을 진행해 첫 보고서를 만들어 보세요. 🙂'}
            {isSearchEmpty && `“${searchTerm}”에 해당하는 보고서를 찾지 못했어요.`}
          </div>
        )}

        <table className="video-report-table">
          <thead>
            <tr>
              <th></th>
              <th>No</th>
              <th>제목</th>
              <th>날짜</th>
              <th>작성자</th>
            </tr>
          </thead>
          <tbody>
          {page.map(({ id, title, date, author }, idx) => (
              <tr key={id}>
                <td>
                  {/* ✅ 체크박스 활성화 */}
                  <input
                    type="checkbox"
                    checked={selectedIds.has(id)}
                    onChange={() => toggleSelect(id)}
                  />
                </td>
                <td>{(currentPage - 1) * PAGE_SIZE + idx + 1}</td>
                <td><Link to={`/report/video/${id}`}>{title}</Link></td>
                <td>{date}</td>
                <td>{author}</td>
              </tr>
            ))}
            {page.length === 0 && (
              <tr><td colSpan="5"> 검색결과가 없습니다.</td></tr>
            )}
          </tbody>
        </table>

        {/* 페이지네이션: 결과가 있을 때만 노출 */}
        {filteredReports.length > 0 && totalPages > 1 && (
          <div className="pagination">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                className={`page-btn ${currentPage === i + 1 ? 'active' : ''}`}
                onClick={() => setCurrentPage(i + 1)}
                aria-current={currentPage === i + 1 ? 'page' : undefined}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
