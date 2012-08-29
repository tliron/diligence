Name:           diligence
Summary:        A server-side JavaScript web development framework based on Prudence and MongoDB.
Version:        1.0beta1
Release:        0
Group:          Three Crickets
License:        LGPLv3+

%description 
A server-side JavaScript web development framework based on Prudence and MongoDB.

%prep

%build

%clean 

%install

%post
mkdir -p /usr/lib/diligence/.sincerity

mkdir -p /var/log/diligence
chmod a+w /var/log/diligence
ln -fsT /var/log/diligence /usr/lib/diligence/logs

mkdir -p /var/cache/diligence
chmod a+w /var/cache/diligence
ln -fsT /var/cache/diligence /usr/lib/diligence/cache 

chmod a+w -R /var/lib/diligence
chmod a+w -R /etc/diligence

ln -fsT /var/lib/diligence/programs /usr/lib/diligence/programs 
ln -fsT /var/lib/diligence/libraries /usr/lib/diligence/libraries 
ln -fsT /var/lib/diligence/component /usr/lib/diligence/component 
ln -fsT /etc/diligence /usr/lib/diligence/configuration 

%preun
rm -rf /usr/lib/diligence/.sincerity
rm -f /usr/lib/diligence/logs
rm -f /usr/lib/diligence/cache
rm -f /usr/lib/diligence/programs
rm -f /usr/lib/diligence/libraries
rm -f /usr/lib/diligence/component
rm -f /usr/lib/diligence/configuration

%files
/*

%changelog
* Thu May 10 2012 Tal Liron <tal.liron@threecrickets.com>
- Initial release
