import React from 'react';

const TheKing = () => {
  const style = {
    height: '850px',
    width: '1124px',
    position: 'absolute',
    overflow: 'hidden',
    backgroundImage: 'url(./assets/theking-background.png)',
    backgroundSize: 'contain',
    backgroundRepeat: 'no-repeat',
  };

  const style2 = {
    position: 'absolute',
    left: '100px',
    top: '102px',
  };

  return (
    <div style={style}>
      <div style={style2}>
        <video src="./assets/theking.mp4" height="540" width="540" loop autoPlay>
          <track default kind="captions" srcLang="en" />
        </video>
      </div>
    </div>
  );
};

export default TheKing;
