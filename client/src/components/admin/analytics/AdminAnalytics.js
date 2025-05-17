import React from 'react';
import './AdminAnalytics.css';

const AdminAnalytics = () => {
  // В будущем здесь можно добавить настоящую аналитику
  // Пока просто заглушка с примером

  return (
    <div className="admin-analytics">
      <h2>Аналитика</h2>
      
      <div className="analytics-section">
        <h3>Посещаемость по дням недели</h3>
        <div className="chart-placeholder">
          <div className="chart-bar" style={{ height: '60%' }}><span>Пн</span></div>
          <div className="chart-bar" style={{ height: '75%' }}><span>Вт</span></div>
          <div className="chart-bar" style={{ height: '50%' }}><span>Ср</span></div>
          <div className="chart-bar" style={{ height: '80%' }}><span>Чт</span></div>
          <div className="chart-bar" style={{ height: '90%' }}><span>Пт</span></div>
          <div className="chart-bar" style={{ height: '65%' }}><span>Сб</span></div>
          <div className="chart-bar" style={{ height: '40%' }}><span>Вс</span></div>
        </div>
      </div>
      
      <div className="analytics-section">
        <h3>Распределение абонементов по типам</h3>
        <div className="pie-chart-placeholder">
          <div className="pie-chart-legend">
            <div className="legend-item">
              <span className="color-box monthly"></span>
              <span>Месячный: 45%</span>
            </div>
            <div className="legend-item">
              <span className="color-box quarterly"></span>
              <span>Квартальный: 30%</span>
            </div>
            <div className="legend-item">
              <span className="color-box annual"></span>
              <span>Годовой: 15%</span>
            </div>
            <div className="legend-item">
              <span className="color-box single"></span>
              <span>Разовый: 10%</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="analytics-note">
        <p>В этом разделе будет представлена подробная аналитика по всем аспектам работы бассейна. В будущих обновлениях мы добавим интерактивные графики с возможностью фильтрации по различным параметрам, экспорт данных и автоматически обновляемые отчеты.</p>
      </div>
    </div>
  );
};

export default AdminAnalytics;