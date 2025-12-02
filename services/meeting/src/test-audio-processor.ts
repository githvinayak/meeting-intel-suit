import path from 'path';
import { AudioProcessor } from './processor/audioProcessor';

async function testAudioProcessor() {
  console.log('🧪 Testing Audio Processor...\n');

  // Test 1: Supported formats
  console.log('📋 Supported Audio Formats:');
  console.log('  ', ['mp3', 'mp4', 'm4a', 'wav', 'webm', 'mpeg', 'mpga'].join(', '));
  console.log('');

  // Test 2: Validation (will fail since file doesn't exist - that's expected)
  console.log('🔍 Testing file validation...');
  const testFilePath = path.join(__dirname, '../uploads/test.mp3');

  try {
    await AudioProcessor.validate(testFilePath);
    console.log('  ✅ Validation passed');
  } catch (error: any) {
    console.log('  ⚠️  Expected error (file not found):', error.message);
  }

  // Test 3: Cost calculation
  console.log('\n💰 Testing cost calculation:');
  const durations = [60, 300, 600, 1800, 3600]; // 1min, 5min, 10min, 30min, 1hr

  durations.forEach((duration) => {
    const cost = AudioProcessor.calculateEstimatedCost(duration);
    const minutes = duration / 60;
    console.log(`  ${minutes}min audio → $${cost.toFixed(4)}`);
  });

  // Test 4: Chunking check
  console.log('\n📦 Testing chunking requirements:');
  const fileSizes = [
    { size: 5 * 1024 * 1024, label: '5MB' },
    { size: 15 * 1024 * 1024, label: '15MB' },
    { size: 25 * 1024 * 1024, label: '25MB' },
    { size: 30 * 1024 * 1024, label: '30MB' },
  ];

  fileSizes.forEach(({ size, label }) => {
    const needsChunking = AudioProcessor.needsChunking(size);
    console.log(`  ${label} → ${needsChunking ? '✂️  Needs chunking' : '✅ Single file OK'}`);
  });

  console.log('\n✅ Audio processor tests completed!');
}

testAudioProcessor();
