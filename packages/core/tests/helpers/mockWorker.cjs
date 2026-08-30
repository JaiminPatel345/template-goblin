process.on('message', (m) => {
  if (m.type === 'init') {
    process.send({ type: 'ready' })
    return
  }
  if (m.type === 'shutdown') {
    process.exit(0)
  }
  if (m.type === 'job') {
    if (!m.data?.texts?.name) {
      process.send({ type: 'result', success: false, error: 'Missing required field: name' })
    } else {
      process.send({
        type: 'result',
        success: true,
        pdf: Buffer.from('%PDF-1.4 test').toString('base64'),
      })
    }
  }
})
