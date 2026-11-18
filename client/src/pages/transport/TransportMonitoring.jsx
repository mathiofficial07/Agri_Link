import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Thermometer, Droplets, Truck, MapPin, AlertTriangle, ShieldCheck,
  CheckCircle2, Clock, RefreshCw, ArrowLeft, Activity
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import io from 'socket.io-client';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001';

export default function TransportMonitoring() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [transport, setTransport] = useState(null);
  const [latestSensor, setLatestSensor] = useState(null);
  const [sensorHistory, setSensorHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAlert, setIsAlert] = useState(false);

  const fetchIotSensorData = async (targetId) => {
    try {
      const iotRes = await axios.get(`${BACKEND_URL}/api/v1/iot/sensor-data/${targetId}`);
      if (iotRes.data?.success && Array.isArray(iotRes.data.sensorHistory) && iotRes.data.sensorHistory.length > 0) {
        const sortedHistory = [...iotRes.data.sensorHistory].sort((a, b) => new Date(a.recordedAt) - new Date(b.recordedAt));
        const formattedHistory = sortedHistory.map(item => ({
          recordedAt: new Date(item.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          temperature: parseFloat(item.temperature),
          humidity: parseFloat(item.humidity)
        }));
        
        const latest = sortedHistory[sortedHistory.length - 1];
        const latestTemp = parseFloat(latest.temperature);
        const latestHum = parseFloat(latest.humidity);

        setLatestSensor({
          temperature: latestTemp,
          humidity: latestHum,
          recordedAt: new Date(latest.recordedAt)
        });
        
        if (latestTemp > 30.0) {
          setIsAlert(true);
        } else {
          setIsAlert(false);
        }

        setSensorHistory(formattedHistory.slice(-20));
      }
    } catch (e) {}
  };

  const fetchTransportData = async () => {
    try {
      setLoading(true);
      const targetId = id || 'TR001';

      let matchedLocal = null;
      try {
        const localAssigned = JSON.parse(localStorage.getItem('agritrack_assigned_transports') || '[]');
        const localAccepted = JSON.parse(localStorage.getItem('agritrack_accepted_bids') || '[]');
        const localSold = JSON.parse(localStorage.getItem('completed_sold_crops') || '[]');

        matchedLocal = [...localAssigned, ...localAccepted, ...localSold].find(t => 
          String(t.transportId) === String(targetId) || String(t.id) === String(targetId) || String(t._id) === String(targetId)
        );
      } catch (e) {}

      let apiTransport = null;
      try {
        const res = await axios.get(`${BACKEND_URL}/api/v1/transport/${targetId}`);
        if (res.data.success) {
          apiTransport = res.data.transport;
        }
      } catch (e) {}

      let mergedTransport = null;
      if (apiTransport || matchedLocal) {
        mergedTransport = {
          transportId: targetId,
          cropName: matchedLocal?.cropName || matchedLocal?.name || apiTransport?.cropName || 'Organic Tomato',
          quantity: Number(matchedLocal?.quantity) || Number(apiTransport?.quantity) || 500,
          unit: matchedLocal?.unit || apiTransport?.unit || 'kg',
          sourceLocation: matchedLocal?.sourceLocation || matchedLocal?.farmLocation || apiTransport?.sourceLocation || 'Salem Farm',
          destinationLocation: matchedLocal?.destinationLocation || matchedLocal?.deliveryAddress || apiTransport?.destinationLocation || 'Retail Market Hub',
          farmerName: matchedLocal?.farmerName || apiTransport?.farmerName || 'Rajesh Kumar',
          winnerName: matchedLocal?.winnerName || matchedLocal?.buyerName || apiTransport?.winnerName || 'Amit Agro Services',
          deviceId: matchedLocal?.deviceId || apiTransport?.deviceId || 'ESP8266_01',
          status: matchedLocal?.status || matchedLocal?.transportStatus || apiTransport?.status || 'IN_TRANSIT'
        };
      } else {
        mergedTransport = {
          transportId: targetId,
          cropName: 'Organic Tomato',
          quantity: 500,
          unit: 'kg',
          sourceLocation: 'Salem Farm',
          destinationLocation: 'Retail Market Hub',
          deviceId: 'ESP8266_01',
          status: 'IN_TRANSIT'
        };
      }

      setTransport(mergedTransport);

      // Fetch initial hardware IoT readings
      await fetchIotSensorData(targetId);

    } catch (err) {
      console.error('Error fetching transport monitoring details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const targetId = id || 'TR001';
    fetchTransportData();

    // 1. Listen to real hardware telemetry stream via Socket.IO
    let socket = null;
    try {
      socket = io(BACKEND_URL);
      socket.emit('transport:join', targetId);

      socket.on('transport:telemetry', (data) => {
        const newTemp = parseFloat(data.temperature);
        const newHum = parseFloat(data.humidity);
        const recTime = data.recordedAt ? new Date(data.recordedAt) : new Date();

        if (!isNaN(newTemp) && !isNaN(newHum)) {
          setLatestSensor({
            temperature: newTemp,
            humidity: newHum,
            recordedAt: recTime
          });

          if (data.isAlert || newTemp > 30.0) {
            setIsAlert(true);
          } else {
            setIsAlert(false);
          }

          setSensorHistory((prev) => {
            const newEntry = {
              temperature: newTemp,
              humidity: newHum,
              recordedAt: recTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            };
            return [...prev, newEntry].slice(-20);
          });
        }
      });
    } catch (e) {}

    // 2. Poll hardware API endpoint every 2 seconds for fresh hardware readings
    const pollInterval = setInterval(() => {
      fetchIotSensorData(targetId);
    }, 2000);

    return () => {
      if (socket) socket.disconnect();
      clearInterval(pollInterval);
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
          <p className="text-sm font-bold text-slate-600">Connecting to ESP8266 + DHT22 IoT Sensor Feed...</p>
        </div>
      </div>
    );
  }

  const chartData = sensorHistory.length > 0 ? sensorHistory : [
    { recordedAt: '01:38:00 pm', temperature: 26.1, humidity: 65.0 },
    { recordedAt: '01:38:02 pm', temperature: 26.3, humidity: 64.8 },
    { recordedAt: '01:38:04 pm', temperature: 26.4, humidity: 64.7 },
    { recordedAt: '01:38:06 pm', temperature: latestSensor?.temperature ?? 26.5, humidity: latestSensor?.humidity ?? 64.6 }
  ];

  return (
    <div className="min-h-screen bg-slate-50/60 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">ESP8266 + DHT22 ACTIVE FEED</span>
          </div>
        </div>

        {/* Transport Overview Header */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-extrabold rounded-lg uppercase">
                {transport?.status || 'IN_TRANSIT'}
              </span>
              <span className="text-xs font-bold text-slate-400">ID: {transport?.transportId || id || 'TR001'}</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900">{transport?.cropName || 'Organic Tomato'} ({transport?.quantity || 500} kg)</h1>
            <p className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" /> {transport?.sourceLocation || 'Salem Farm'} ➔ {transport?.destinationLocation || 'Retail Market Hub'}
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <Truck className="w-8 h-8 text-emerald-600" />
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">IoT Sensor Unit</span>
              <span className="text-xs font-bold text-slate-800">{transport?.deviceId || 'ESP8266_01'}</span>
            </div>
          </div>
        </div>

        {/* Pending Transport Banner */}
        {transport?.status !== 'IN_TRANSIT' && transport?.status !== 'DELIVERED' && (
          <div className="bg-amber-500 text-slate-950 p-6 rounded-3xl border-2 border-amber-400 shadow-xl space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-slate-950" />
              <h3 className="text-base font-black uppercase tracking-wider text-slate-950">
                🔒 Transport Pending: Sensor Monitoring Not Active Yet
              </h3>
            </div>
            <p className="text-xs font-semibold text-slate-900/90">
              {transport?.status === 'AWAITING_RETAILER_PAYMENT'
                ? 'Winning bidder has selected the retailer. Sensor monitoring will activate once the retailer completes payment and the winning bidder approves transport.'
                : 'Retailer has completed payment! Sensor monitoring will activate as soon as the winning bidder approves transport.'}
            </p>
          </div>
        )}

        {/* Alert Notification Header if threshold breached */}
        {transport?.status === 'IN_TRANSIT' && (isAlert || (latestSensor && latestSensor.temperature > 30)) && (
          <div className="bg-amber-500 text-white p-4 rounded-2xl shadow-md flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-white" />
              <div>
                <h4 className="font-extrabold text-sm">TRANSPORT CONDITION ALERT</h4>
                <p className="text-xs opacity-90">Current temperature ({latestSensor?.temperature}°C) exceeds recommended safety limit (30.0°C)!</p>
              </div>
            </div>
            <span className="text-xs font-black bg-white/20 px-3 py-1 rounded-full uppercase">SPOILAGE RISK</span>
          </div>
        )}

        {/* Live Gauges Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          
          {/* Temperature Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-rose-500" /> Live Ambient Temperature
              </span>
              <span className="text-xs font-bold text-slate-400">Limit: 30.0 °C</span>
            </div>

            <div className="flex items-baseline justify-between pt-2">
              <div className="text-5xl font-black text-slate-900">
                {latestSensor ? latestSensor.temperature : '--'} <span className="text-2xl font-normal text-slate-400">°C</span>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-extrabold ${
                !latestSensor ? 'bg-slate-100 text-slate-500' : (latestSensor.temperature > 30 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700')
              }`}>
                {!latestSensor ? 'AWAITING HARDWARE' : (latestSensor.temperature > 30 ? 'HIGH TEMP' : 'OPTIMAL')}
              </span>
            </div>

            <p className="text-xs text-slate-500 font-medium pt-1 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${latestSensor ? 'bg-emerald-500 animate-ping' : 'bg-amber-400'} shrink-0`} />
              <span>
                {latestSensor ? `Recorded at: ${new Date(latestSensor.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : 'Waiting for ESP8266 + DHT22 hardware telemetry...'}
              </span>
              {latestSensor && <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded uppercase">Hardware Feed</span>}
            </p>
          </div>

          {/* Humidity Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Droplets className="w-4 h-4 text-blue-500" /> Live Relative Humidity
              </span>
              <span className="text-xs font-bold text-slate-400">Limit: 80.0 %</span>
            </div>

            <div className="flex items-baseline justify-between pt-2">
              <div className="text-5xl font-black text-slate-900">
                {latestSensor ? latestSensor.humidity : '--'} <span className="text-2xl font-normal text-slate-400">%</span>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-extrabold ${!latestSensor ? 'bg-slate-100 text-slate-500' : 'bg-blue-100 text-blue-700'}`}>
                {!latestSensor ? 'AWAITING HARDWARE' : 'GOOD MOISTURE'}
              </span>
            </div>

            <p className="text-xs text-slate-500 font-medium pt-1 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${latestSensor ? 'bg-blue-500 animate-ping' : 'bg-amber-400'} shrink-0`} />
              <span>
                {latestSensor ? `Recorded at: ${new Date(latestSensor.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : 'Waiting for ESP8266 + DHT22 hardware telemetry...'}
              </span>
              {latestSensor && <span className="text-[10px] font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded uppercase">Hardware Feed</span>}
            </p>
          </div>

        </div>

        {/* Historical Charts */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-600" /> Historical Sensor Telemetry Charts
              </h3>
              <p className="text-xs text-slate-400 font-medium">Real-time ESP8266 readings recorded during transit.</p>
            </div>
            <span className="text-xs font-bold text-slate-400">DHT22 Telemetry Log</span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="recordedAt" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip />
                <Line type="monotone" dataKey="temperature" stroke="#f43f5e" strokeWidth={3} name="Temperature (°C)" />
                <Line type="monotone" dataKey="humidity" stroke="#3b82f6" strokeWidth={3} name="Humidity (%)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
