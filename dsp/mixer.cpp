// Original DSP. Stereo complementary one-pole crossovers at 250 Hz / 4 kHz.
static float io[768], state[2][2][2], params[2][5]={{1,1,1,1,0.8f},{1,1,1,1,0.8f}};
static float crossA=.70710678f,crossB=.70710678f,master=.8f, lowA=.032f,highA=.407f;
extern "C" {
int buffer(){return (int)(long)io;}
void reset(int d){for(int c=0;c<2;c++)for(int b=0;b<2;b++)state[d][c][b]=0;}
void configure(float l,float h){lowA=l;highA=h;}
void channel(int d,float g,float l,float m,float h,float v){params[d][0]=g;params[d][1]=l;params[d][2]=m;params[d][3]=h;params[d][4]=v;}
void mixer(float a,float b,float m){crossA=a;crossB=b;master=m;}
void process(int n){for(int i=0;i<n;i++)for(int c=0;c<2;c++){float sum=0;for(int d=0;d<2;d++){float x=io[d*256+i*2+c];float &lo=state[d][c][0],&hi=state[d][c][1];lo+=lowA*(x-lo);hi+=highA*(x-hi);float y=(lo*params[d][1]+(hi-lo)*params[d][2]+(x-hi)*params[d][3])*params[d][0]*params[d][4];io[d*256+i*2+c]=y;sum+=y*(d?crossB:crossA);}io[512+i*2+c]=sum*master;}}
}
