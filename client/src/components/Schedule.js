import React, { useEffect, useState } from 'react';
import axios from 'axios';

function Schedule() {
  const [schedule, setSchedule] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:3000/api/schedule')
      .then(res => setSchedule(res.data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div>
      <h2>Расписание тренировок</h2>
      <ul>
        {schedule.map((item, index) => (
          <li key={index}>
            {item.group} — {item.time} (тренер: {item.coach})
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Schedule;
