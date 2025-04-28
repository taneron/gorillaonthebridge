const handleMotion = (event: DeviceMotionEvent) => {
    const { accelerationIncludingGravity, rotationRate, interval } = event;
    const ball = document.getElementById('motion-ball');

    // Update ball position based on acceleration
    //@ts-ignore
    const x = accelerationIncludingGravity.x * 2;
    //@ts-ignore
    const y = accelerationIncludingGravity.y * 2;
    //@ts-ignore
    ball.style.transform = `translate(${x}px, ${y}px)`;

    // Update numerical readouts
    //@ts-ignore
    document.getElementById('accel-x').textContent = accelerationIncludingGravity.x.toFixed(2);

    //@ts-ignore
    document.getElementById('accel-y').textContent = accelerationIncludingGravity.y.toFixed(2);
    //@ts-ignore
    document.getElementById('accel-z').textContent = accelerationIncludingGravity.z.toFixed(2);
    //@ts-ignore
    document.getElementById('rotation-alpha').textContent = rotationRate?.alpha?.toFixed(2) || '0.00';
    //@ts-ignore
    document.getElementById('rotation-beta').textContent = rotationRate?.beta?.toFixed(2) || '0.00';
    //@ts-ignore
    document.getElementById('rotation-gamma').textContent = rotationRate?.gamma?.toFixed(2) || '0.00';
};